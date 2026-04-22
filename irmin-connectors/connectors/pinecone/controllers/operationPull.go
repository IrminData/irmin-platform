package pineconecontrollers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
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

// PineconePullProvider implements the PullOperationProvider interface for Pinecone.
type PineconePullProvider struct {
	namespace  *string
	dbInstance *db.Database
	logger     *slog.Logger
}

// ProgressHandler returns the per-page observability callback the
// Pinecone client fires from inside FetchAll's cursor-pagination
// loop. Without it, a 100k-vector pull emits zero events between
// operation/init and operation/pull's final response — the same
// silent-window failure mode Stripe got fixed for.
//
// Always returns a non-nil handler. Nil-safety lives one layer down
// in common.LogOperationProgress, which no-ops on nil dbInstance /
// logger / nil operation.
//
// Throttling lives in common.LogOperationProgress (every 5 pages).
func (p *PineconePullProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return func(event common.ProgressEvent) {
		var operationID uint
		if operation != nil {
			operationID = operation.ID
		}
		common.LogOperationProgress(p.dbInstance, p.logger, operationID, event)
	}
}

// getNamespaceValue returns the namespace value or empty string if nil.
func (p *PineconePullProvider) getNamespaceValue() string {
	if p.namespace == nil {
		return ""
	}
	return *p.namespace
}

// parquetInsertBatchSize is the batch size for inserting records into DuckDB.
const parquetInsertBatchSize = 100

// InitializeClient initializes the Pinecone client for pull operations.
func (p *PineconePullProvider) InitializeClient(
	_ fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	// Hydrate logger before building the handler so the closure
	// p.ProgressHandler returns has a valid logger.
	p.logger = logger
	client, namespace, err := pineconeclient.InitPineconeClient(
		nil, logger, operation,
		pineconeclient.WithProgressHandler(p.ProgressHandler(operation)),
	)
	if err != nil {
		return nil, nil, func() {}, err
	}

	p.namespace = namespace

	cleanup := func() {
		_ = client.Close()
	}

	return client, namespace, cleanup, nil
}

// GetAllFiles retrieves all vectors from Pinecone as a parquet file.
func (p *PineconePullProvider) GetAllFiles(c fiber.Ctx, client any) ([]string, [][]byte, error) {
	pineconeClient, ok := client.(*pineconeclient.PineconeClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for Pinecone pull provider")
	}

	operation, _ := c.Locals("operation").(*db.Operation)

	// Fetch all vectors from Pinecone
	ctx := context.Background()
	records, err := pineconeClient.FetchAll(ctx)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to fetch vectors from Pinecone",
				map[string]any{
					"error":     err.Error(),
					"namespace": p.getNamespaceValue(),
				},
			)
		}
		return nil, nil, fmt.Errorf("failed to fetch vectors: %w", err)
	}

	if len(records) == 0 {
		return nil, nil, errors.New("no vectors found in the index")
	}

	// Convert to parquet
	parquetBytes, err := p.recordsToParquet(records)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to convert to parquet: %w", err)
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Successfully fetched all vectors from Pinecone",
			map[string]any{
				"vector_count": len(records),
				"namespace":    p.getNamespaceValue(),
			},
		)
	}

	return []string{"embeddings.parquet"}, [][]byte{parquetBytes}, nil
}

// GetFileByPath handles both search (path = query) and fetch operations.
func (p *PineconePullProvider) GetFileByPath(c fiber.Ctx, client any, rawPath string) (string, []byte, error) {
	pineconeClient, ok := client.(*pineconeclient.PineconeClient)
	if !ok {
		return "", nil, errors.New("invalid client type for Pinecone pull provider")
	}

	// If path is provided, treat it as a search query
	if rawPath != "" {
		return p.performSearch(c, pineconeClient, rawPath)
	}

	// No path - fetch all vectors as parquet
	return p.fetchAllAsParquet(pineconeClient)
}

// performSearch handles search operations with a query vector.
func (p *PineconePullProvider) performSearch(
	c fiber.Ctx,
	pineconeClient *pineconeclient.PineconeClient,
	rawPath string,
) (string, []byte, error) {
	operation, _ := c.Locals("operation").(*db.Operation)
	ctx := context.Background()

	// Try to parse the path as a JSON vector
	var queryVector []float32
	if err := json.Unmarshal([]byte(rawPath), &queryVector); err != nil {
		return "", nil, errors.New(
			"search requires a query vector; use Irmin API for text search or provide JSON float array",
		)
	}

	// Perform search
	searchResp, err := pineconeClient.Search(ctx, queryVector, pineconeclient.DefaultTopK)
	if err != nil {
		p.logSearchError(operation, err)
		return "", nil, fmt.Errorf("search failed: %w", err)
	}

	// Note: Query field is populated by Search method

	// Return search results as JSON
	jsonBytes, err := json.MarshalIndent(searchResp, "", "  ")
	if err != nil {
		return "", nil, fmt.Errorf("failed to marshal search results: %w", err)
	}

	p.logSearchSuccess(operation, len(searchResp.Matches))
	return "search_results.json", jsonBytes, nil
}

// logSearchError logs a search error if logging is available.
func (p *PineconePullProvider) logSearchError(operation *db.Operation, err error) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance,
		p.logger,
		operation.ID,
		db.LogEventTypeError,
		"Failed to search Pinecone",
		map[string]any{
			"error":     err.Error(),
			"namespace": p.getNamespaceValue(),
		},
	)
}

// logSearchSuccess logs a successful search if logging is available.
func (p *PineconePullProvider) logSearchSuccess(operation *db.Operation, matchCount int) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance,
		p.logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Successfully performed Pinecone search",
		map[string]any{
			"match_count": matchCount,
			"namespace":   p.getNamespaceValue(),
		},
	)
}

// fetchAllAsParquet fetches all vectors and converts to parquet.
func (p *PineconePullProvider) fetchAllAsParquet(
	pineconeClient *pineconeclient.PineconeClient,
) (string, []byte, error) {
	ctx := context.Background()

	records, err := pineconeClient.FetchAll(ctx)
	if err != nil {
		return "", nil, fmt.Errorf("failed to fetch vectors: %w", err)
	}

	if len(records) == 0 {
		return "", nil, errors.New("no vectors found in the index")
	}

	parquetBytes, err := p.recordsToParquet(records)
	if err != nil {
		return "", nil, fmt.Errorf("failed to convert to parquet: %w", err)
	}

	return "embeddings.parquet", parquetBytes, nil
}

// recordsToParquet converts EmbeddingRecords to parquet bytes using DuckDB.
// This creates parquet files with native FLOAT[] arrays for embeddings,
// matching the format used by Irmin core's embeddings service.
func (p *PineconePullProvider) recordsToParquet(records []pineconeclient.EmbeddingRecord) ([]byte, error) {
	if len(records) == 0 {
		return nil, errors.New("no records to convert")
	}

	ctx := context.Background()

	// Create DuckDB client
	duckDBClient, err := duckdb.NewInMemoryClient(ctx, p.logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", err)
	}
	defer duckDBClient.Close()

	// Create temp table with flexible FLOAT[] array type for embeddings
	// Using FLOAT[] instead of FLOAT[N] avoids dimension mismatch errors
	// if any records have different embedding sizes
	createTableSQL := `
		CREATE TEMP TABLE embeddings_export (
			id VARCHAR,
			source_file VARCHAR,
			chunk_index INTEGER,
			content TEXT,
			embedding FLOAT[],
			metadata JSON,
			created_at TIMESTAMP
		)
	`

	if _, execErr := duckDBClient.ExecuteNonQuery(ctx, createTableSQL); execErr != nil {
		return nil, fmt.Errorf("failed to create temp table: %w", execErr)
	}

	// Insert records in batches
	for i := 0; i < len(records); i += parquetInsertBatchSize {
		end := i + parquetInsertBatchSize
		if end > len(records) {
			end = len(records)
		}
		batch := records[i:end]

		if insertErr := p.insertEmbeddingBatch(ctx, duckDBClient, batch); insertErr != nil {
			return nil, fmt.Errorf("failed to insert batch %d: %w", i/parquetInsertBatchSize, insertErr)
		}
	}

	// Create temporary file for parquet output
	tempFile, err := os.CreateTemp("", "pinecone_embeddings_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Export to parquet with ZSTD compression
	escapedPath := strings.ReplaceAll(tempPath, "'", "''")
	exportSQL := fmt.Sprintf(`
		COPY embeddings_export TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)
	`, escapedPath)

	if _, execErr := duckDBClient.ExecuteNonQuery(ctx, exportSQL); execErr != nil {
		return nil, fmt.Errorf("failed to export to parquet: %w", execErr)
	}

	// Read the parquet file
	data, err := os.ReadFile(tempPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read parquet file: %w", err)
	}

	return data, nil
}

// insertEmbeddingBatch inserts a batch of embedding records into the DuckDB temp table.
func (p *PineconePullProvider) insertEmbeddingBatch(
	ctx context.Context,
	client *duckdb.InMemoryClient,
	records []pineconeclient.EmbeddingRecord,
) error {
	if len(records) == 0 {
		return nil
	}

	var values []string
	for _, record := range records {
		// Convert embedding to DuckDB array literal
		embeddingStr := vectorToArrayString(record.Embedding)

		// Convert metadata to JSON
		metadataBytes, err := json.Marshal(record.Metadata)
		if err != nil {
			metadataBytes = []byte("{}")
		}
		metadataStr := escapeSQLString(string(metadataBytes))

		// Format the row value
		// Use RFC3339 format for timestamps to ensure compatibility with push operations
		// Use FLOAT[] (flexible array) instead of FLOAT[N] to handle any embedding dimension
		value := fmt.Sprintf(`('%s', '%s', %d, '%s', %s::FLOAT[], '%s'::JSON, '%s')`,
			escapeSQLString(record.ID),
			escapeSQLString(record.SourceFile),
			record.ChunkIndex,
			escapeSQLString(record.Content),
			embeddingStr,
			metadataStr,
			record.CreatedAt.Format(time.RFC3339),
		)
		values = append(values, value)
	}

	insertSQL := fmt.Sprintf(`
		INSERT INTO embeddings_export (id, source_file, chunk_index, content, embedding, metadata, created_at)
		VALUES %s
	`, strings.Join(values, ", "))

	if _, err := client.ExecuteNonQuery(ctx, insertSQL); err != nil {
		return fmt.Errorf("failed to insert batch: %w", err)
	}

	return nil
}

// vectorToArrayString converts a float32 slice to a DuckDB array literal string.
func vectorToArrayString(embedding []float32) string {
	if len(embedding) == 0 {
		return "[]"
	}

	var sb strings.Builder
	sb.WriteString("[")
	for i, v := range embedding {
		if i > 0 {
			sb.WriteString(", ")
		}
		// Use %.9g format to handle both fixed-point and exponential notation
		sb.WriteString(fmt.Sprintf("%.9g", v))
	}
	sb.WriteString("]")
	return sb.String()
}

// escapeSQLString escapes a string for safe use in SQL queries.
func escapeSQLString(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

// OperationPull godoc
// @Summary Pull data from Pinecone
// @Description Pull vectors from Pinecone. If path is provided, performs a semantic search and returns JSON results. If path is empty, exports all vectors as a parquet file.
// @Tags pinecone
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string false "Query vector as JSON array for search, or empty for full export"
// @Success 200 {object} fiber.Map "Data pulled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /pinecone/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
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
		"Pull operation execution started",
		nil,
	)

	provider := &PineconePullProvider{
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
			"Failed to initialize Pinecone client for pull operation",
			map[string]any{
				"error": initErr.Error(),
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize client: " + initErr.Error(),
		})
	}
	defer cleanup()

	// Parse "path" field from form
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to parse form fields for pull operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	rawPath := fields["path"]

	// Prepare the result files
	resultFiles := make(map[string][]byte)

	if rawPath == "" {
		// Fetch all vectors
		resultPaths, resultContents, getErr := provider.GetAllFiles(c, client)
		if getErr != nil {
			cs.Logger.Error("failed to get all vectors", "error", getErr)
			common.LogOperationEvent(
				cs.DB,
				cs.Logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to fetch all vectors during pull operation",
				map[string]any{
					"error": getErr.Error(),
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch vectors: " + getErr.Error(),
			})
		}
		for i, resultPath := range resultPaths {
			resultFiles[resultPath] = resultContents[i]
		}
	} else {
		// Search with query
		resultPath, resultContent, getErr := provider.GetFileByPath(c, client, rawPath)
		if getErr != nil {
			cs.Logger.Error("failed to search", "error", getErr)
			common.LogOperationEvent(
				cs.DB,
				cs.Logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to search during pull operation",
				map[string]any{
					"error": getErr.Error(),
					"query": rawPath,
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to search: " + getErr.Error(),
			})
		}
		resultFiles[resultPath] = resultContent
	}

	// Create a zip archive of the result files
	zipBytes, err := irminutils.ZipFiles(resultFiles)
	if err != nil {
		cs.Logger.Error("failed to create zip archive", "error", err)
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to create zip archive for pull operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create zip archive",
		})
	}

	// Log successful completion
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Pull operation completed successfully",
		map[string]any{
			"file_count": len(resultFiles),
			"path":       rawPath,
		},
	)

	// Return the result files as a zip archive stream
	c.Response().Header.Set("Content-Type", "application/zip")
	c.Response().Header.Set("Content-Disposition", "attachment; filename=result.zip")
	return c.Status(fiber.StatusOK).SendStream(bytes.NewReader(zipBytes))
}

// SubscribeToChanges is not supported by Pinecone connector.
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Subscribe to changes is not supported by the Pinecone connector",
	})
}

// UnsubscribeFromChanges is not supported by Pinecone connector.
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Subscribe to changes is not supported by the Pinecone connector",
	})
}
