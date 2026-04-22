package pineconecontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"irmin-connectors/connectors/common"
	pineconeclient "irmin-connectors/connectors/pinecone/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	"github.com/IrminData/irmin-sdk-go/duckdb"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// PineconePushProvider implements the PushOperationProvider interface for Pinecone.
type PineconePushProvider struct {
	namespace  *string
	dbInstance *db.Database
	logger     *slog.Logger
}

// ProgressHandler returns nil today — Phase 3 of the
// progress-events rollout adds per-batch upsert progress
// (ProgressKindBatch). The baseline heartbeat from the common push
// handler covers the gap.
func (p *PineconePushProvider) ProgressHandler(_ *db.Operation) common.ProgressHandler {
	return nil
}

// getNamespaceValue returns the namespace value or empty string if nil.
func (p *PineconePushProvider) getNamespaceValue() string {
	if p.namespace == nil {
		return ""
	}
	return *p.namespace
}

// InitializeClient initializes the Pinecone client for push operations.
func (p *PineconePushProvider) InitializeClient(
	_ fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, namespace, err := pineconeclient.InitPineconeClient(nil, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialize Pinecone client: %w", err)
	}

	p.namespace = namespace
	p.logger = logger

	cleanup := func() {
		_ = client.Close()
	}

	return client, namespace, cleanup, nil
}

// ProcessFiles processes the extracted files and upserts them to Pinecone.
func (p *PineconePushProvider) ProcessFiles(
	c fiber.Ctx,
	client any,
	files map[string][]byte,
	_ string,
) error {
	pineconeClient, ok := client.(*pineconeclient.PineconeClient)
	if !ok {
		return errors.New("invalid client type for Pinecone push provider")
	}

	operation, _ := c.Locals("operation").(*db.Operation)
	totalRecords, err := p.processParquetFiles(pineconeClient, files, operation)
	if err != nil {
		return err
	}

	if totalRecords == 0 {
		return errors.New("no embedding records found in uploaded files")
	}

	return nil
}

// processParquetFiles processes all parquet files and returns total record count.
func (p *PineconePushProvider) processParquetFiles(
	pineconeClient *pineconeclient.PineconeClient,
	files map[string][]byte,
	operation *db.Operation,
) (int, error) {
	ctx := context.Background()
	var totalRecords int

	for filePath, fileData := range files {
		if !strings.HasSuffix(filePath, ".parquet") {
			if p.logger != nil {
				p.logger.InfoContext(ctx, "skipping non-parquet file", "file", filePath)
			}
			continue
		}

		count, err := p.processSingleParquetFile(ctx, pineconeClient, filePath, fileData, operation)
		if err != nil {
			return totalRecords, err
		}
		totalRecords += count
	}

	return totalRecords, nil
}

// processSingleParquetFile processes a single parquet file.
func (p *PineconePushProvider) processSingleParquetFile(
	ctx context.Context,
	pineconeClient *pineconeclient.PineconeClient,
	filePath string,
	fileData []byte,
	operation *db.Operation,
) (int, error) {
	records, err := p.parseParquetFile(fileData)
	if err != nil {
		p.logParseError(operation, filePath, err)
		return 0, fmt.Errorf("failed to parse parquet file %s: %w", filePath, err)
	}

	if len(records) == 0 {
		if p.logger != nil {
			p.logger.InfoContext(ctx, "skipping empty parquet file", "file", filePath)
		}
		return 0, nil
	}

	if err = pineconeClient.Upsert(ctx, records); err != nil {
		p.logUpsertError(operation, filePath, len(records), err)
		return 0, fmt.Errorf("failed to upsert vectors from %s: %w", filePath, err)
	}

	p.logUpsertSuccess(operation, filePath, len(records))
	return len(records), nil
}

// logParseError logs a parquet parse error.
func (p *PineconePushProvider) logParseError(operation *db.Operation, filePath string, err error) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance,
		p.logger,
		operation.ID,
		db.LogEventTypeError,
		"Failed to parse parquet file",
		map[string]any{
			"error": err.Error(),
			"file":  filePath,
		},
	)
}

// logUpsertError logs an upsert error.
func (p *PineconePushProvider) logUpsertError(operation *db.Operation, filePath string, recordCount int, err error) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance,
		p.logger,
		operation.ID,
		db.LogEventTypeError,
		"Failed to upsert vectors to Pinecone",
		map[string]any{
			"error":        err.Error(),
			"file":         filePath,
			"record_count": recordCount,
		},
	)
}

// logUpsertSuccess logs a successful upsert.
func (p *PineconePushProvider) logUpsertSuccess(operation *db.Operation, filePath string, recordCount int) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance,
		p.logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Successfully upserted vectors from parquet file",
		map[string]any{
			"file":         filePath,
			"record_count": recordCount,
			"namespace":    p.getNamespaceValue(),
		},
	)
}

// parseParquetFile parses a parquet file and returns EmbeddingRecords.
func (p *PineconePushProvider) parseParquetFile(data []byte) ([]pineconeclient.EmbeddingRecord, error) {
	tempPath, err := p.writeTempFile(data)
	if err != nil {
		return nil, err
	}
	defer os.Remove(tempPath)

	return p.readParquetRecords(tempPath)
}

// writeTempFile writes data to a temporary file and returns the path.
func (p *PineconePushProvider) writeTempFile(data []byte) (string, error) {
	tempFile, err := os.CreateTemp("", "pinecone_upload_*.parquet")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()

	if _, writeErr := tempFile.Write(data); writeErr != nil {
		_ = tempFile.Close()
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	return tempPath, nil
}

// readParquetRecords reads embedding records from a parquet file using DuckDB.
// This supports both native array types and string (JSON) embeddings.
func (p *PineconePushProvider) readParquetRecords(tempPath string) ([]pineconeclient.EmbeddingRecord, error) {
	ctx := context.Background()

	// Create DuckDB client for reading parquet
	duckDBClient, err := duckdb.NewInMemoryClient(ctx, p.logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", err)
	}
	defer duckDBClient.Close()

	// Validate parquet schema before reading
	escapedPath := strings.ReplaceAll(tempPath, "'", "''")
	if schemaErr := p.validateParquetSchema(ctx, duckDBClient, escapedPath); schemaErr != nil {
		return nil, schemaErr
	}

	// Query parquet file with DuckDB, casting embedding to string for consistent handling
	// This handles both native array types and string embeddings
	query := fmt.Sprintf(`
		SELECT 
			COALESCE(id, '') as id,
			COALESCE(source_file, '') as source_file,
			COALESCE(chunk_index, 0) as chunk_index,
			COALESCE(content, '') as content,
			COALESCE(CAST(embedding AS VARCHAR), '') as embedding,
			COALESCE(CAST(metadata AS VARCHAR), '{}') as metadata,
			COALESCE(CAST(created_at AS VARCHAR), '') as created_at
		FROM read_parquet('%s')
	`, escapedPath)

	rows, err := duckDBClient.ExecuteQuery(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query parquet file: %w", err)
	}
	defer rows.Close()

	var records []pineconeclient.EmbeddingRecord
	for rows.Next() {
		var id, sourceFile, content, embeddingStr, metadataStr, createdAtStr string
		var chunkIndex int

		if scanErr := rows.Scan(&id, &sourceFile, &chunkIndex, &content, &embeddingStr, &metadataStr, &createdAtStr); scanErr != nil {
			return nil, fmt.Errorf("failed to scan record: %w", scanErr)
		}

		embedding, parseErr := p.parseEmbedding(embeddingStr)
		if parseErr != nil {
			if p.logger != nil {
				p.logger.Warn("skipping record with invalid embedding",
					"id", id,
					"error", parseErr.Error(),
				)
			}
			continue
		}
		if len(embedding) == 0 {
			if p.logger != nil {
				p.logger.Warn("skipping record with zero-dimensional embedding",
					"id", id,
					"embedding_value", embeddingStr,
				)
			}
			continue
		}

		record := pineconeclient.EmbeddingRecord{
			ID:         id,
			SourceFile: sourceFile,
			ChunkIndex: chunkIndex,
			Content:    content,
			Embedding:  embedding,
			Metadata:   p.parseMetadata(metadataStr),
			CreatedAt:  p.parseCreatedAt(createdAtStr),
		}

		records = append(records, record)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating records: %w", rowsErr)
	}

	return records, nil
}

// parseEmbedding parses an embedding from various string formats.
// Supports JSON arrays, DuckDB array format [val1, val2, ...], and comma-separated values.
// Returns an error if parsing fails, or an empty slice for valid but empty embeddings.
func (p *PineconePushProvider) parseEmbedding(embeddingStr string) ([]float32, error) {
	if embeddingStr == "" {
		return nil, nil // Empty string is valid, just no data
	}

	// Try JSON array first
	var embedding []float32
	if err := json.Unmarshal([]byte(embeddingStr), &embedding); err == nil {
		return embedding, nil // Valid JSON (could be empty array)
	}

	// Handle DuckDB array format: [val1, val2, ...]
	str := strings.TrimPrefix(embeddingStr, "[")
	str = strings.TrimSuffix(str, "]")

	if str == "" {
		return []float32{}, nil // Empty brackets [] is valid empty embedding
	}

	parts := strings.Split(str, ",")
	embedding = make([]float32, 0, len(parts))

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			// Skip empty parts (e.g., trailing comma)
			continue
		}
		val, err := strconv.ParseFloat(part, 32)
		if err != nil {
			// Return error instead of nil to distinguish parse failure from empty embedding
			return nil, fmt.Errorf("invalid embedding value %q: %w", part, err)
		}
		embedding = append(embedding, float32(val))
	}

	return embedding, nil
}

// parseMetadata parses metadata from a JSON string.
func (p *PineconePushProvider) parseMetadata(metadataStr string) map[string]string {
	if metadataStr == "" || metadataStr == "{}" {
		return make(map[string]string)
	}

	var metadata map[string]string
	if err := json.Unmarshal([]byte(metadataStr), &metadata); err == nil {
		return metadata
	}

	return make(map[string]string)
}

// parseCreatedAt parses a timestamp from various formats.
// Supports RFC3339, SQL datetime, and other common formats.
// DuckDB may output timestamps with fractional seconds of varying precision,
// so we try multiple formats from most to least specific.
func (p *PineconePushProvider) parseCreatedAt(createdAtStr string) time.Time {
	if createdAtStr == "" {
		return time.Now()
	}

	// Try multiple timestamp formats for compatibility
	// Go's time.Parse requires exact format matching, so we need explicit formats
	// for each fractional second precision level (ordered most specific first)
	formats := []string{
		time.RFC3339Nano,                // "2006-01-02T15:04:05.999999999Z07:00"
		time.RFC3339,                    // "2006-01-02T15:04:05Z07:00"
		"2006-01-02 15:04:05.999999999", // SQL datetime with nanoseconds
		"2006-01-02 15:04:05.999999",    // SQL datetime with microseconds
		"2006-01-02 15:04:05.999",       // SQL datetime with milliseconds
		"2006-01-02 15:04:05",           // SQL datetime (DuckDB export)
		"2006-01-02T15:04:05.999999999", // ISO 8601 with nanoseconds
		"2006-01-02T15:04:05.999999",    // ISO 8601 with microseconds
		"2006-01-02T15:04:05.999",       // ISO 8601 with milliseconds
		"2006-01-02T15:04:05",           // ISO 8601 without timezone
	}

	for _, format := range formats {
		if t, err := time.Parse(format, createdAtStr); err == nil {
			return t
		}
	}

	// Log warning if we couldn't parse the timestamp
	if p.logger != nil {
		p.logger.Warn("failed to parse timestamp, using current time", "timestamp", createdAtStr)
	}

	return time.Now()
}

// validateParquetSchema checks if the parquet file has the required embedding column.
// Returns a user-friendly error if the schema is invalid.
func (p *PineconePushProvider) validateParquetSchema(
	ctx context.Context,
	client *duckdb.InMemoryClient,
	escapedPath string,
) error {
	// Get column names from the parquet file using parquet_schema function
	// The 'name' column contains the field names in the parquet schema
	schemaQuery := fmt.Sprintf(`
		SELECT name 
		FROM parquet_schema('%s')
		WHERE name = 'embedding'
	`, escapedPath)

	rows, err := client.ExecuteQuery(ctx, schemaQuery)
	if err != nil {
		return fmt.Errorf("failed to read parquet schema: %w", err)
	}
	defer rows.Close()

	// Check if embedding column exists
	hasEmbedding := rows.Next()

	// Check for iteration errors before interpreting results
	if rowsErr := rows.Err(); rowsErr != nil {
		return fmt.Errorf("failed to read parquet schema: %w", rowsErr)
	}

	if !hasEmbedding {
		return errors.New(
			"invalid parquet schema: missing required 'embedding' column. " +
				"Expected columns: id, source_file, chunk_index, content, embedding, metadata, created_at",
		)
	}

	return nil
}

// OperationPush godoc
// @Summary Push data to Pinecone
// @Description Push embedding vectors from parquet files to Pinecone index
// @Tags pinecone
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param file formData file true "ZIP file containing parquet embedding files"
// @Param path formData string false "Target path (not used for Pinecone)"
// @Success 200 {object} fiber.Map "Data pushed successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or file format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /pinecone/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Use Level 2 lock to prevent concurrent execution of the same operation
	locked, err := db.TryLockOperationExecution(cs.DB.DB, operation.ID)
	if err != nil {
		cs.Logger.Error("failed to acquire operation execution lock", "error", err, "operation_id", operation.ID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to acquire operation lock",
		})
	}
	if !locked {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Operation is already running",
		})
	}

	// Ensure lock is released when operation completes
	defer func() {
		if unlockErr := db.UnlockOperationExecution(cs.DB.DB, operation.ID); unlockErr != nil {
			cs.Logger.Error("failed to release operation execution lock",
				"error", unlockErr, "operation_id", operation.ID)
		}
	}()

	// Log operation execution start
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Push operation execution started",
		nil,
	)

	provider := &PineconePushProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}

	// Initialize the client
	client, _, cleanup, initErr := provider.InitializeClient(c, cs.Logger, operation)
	if initErr != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to initialize Pinecone client for push operation",
			map[string]any{
				"error": initErr.Error(),
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize client: " + initErr.Error(),
		})
	}
	defer cleanup()

	// Parse form fields for target path
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to parse form fields for push operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	rawPath := fields["path"]

	// Handle uploaded file
	files, err := handleUploadedFile(c)
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to handle uploaded file for push operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if len(files) == 0 {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"No files found in uploaded ZIP",
			nil,
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No files found in uploaded ZIP",
		})
	}

	// Process files using provider
	err = provider.ProcessFiles(c, client, files, rawPath)
	if err != nil {
		cs.Logger.Error("failed to process files", "error", err)
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to process files during push operation",
			map[string]any{
				"error": err.Error(),
				"path":  rawPath,
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process files: " + err.Error(),
		})
	}

	// Log successful completion
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Push operation completed successfully",
		map[string]any{
			"file_count": len(files),
			"path":       rawPath,
		},
	)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Successfully pushed data to Pinecone",
		"status":  "completed",
	})
}

// handleUploadedFile processes the uploaded ZIP file and returns the extracted files.
func handleUploadedFile(c fiber.Ctx) (map[string][]byte, error) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve form file: %w", err)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open form file: %w", err)
	}
	defer file.Close()

	bytesData, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	files, err := irminutils.UnzipFiles(bytesData)
	if err != nil {
		return nil, fmt.Errorf("failed to unzip file: %w", err)
	}

	return files, nil
}
