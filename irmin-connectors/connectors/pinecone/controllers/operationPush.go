package pineconecontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"time"

	"irmin-connectors/connectors/common"
	pineconeclient "irmin-connectors/connectors/pinecone/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/reader"
)

const (
	// parquetReaderParallelNumber is the number of parallel goroutines for parquet reading.
	parquetReaderParallelNumber = 4
	// parquetReadBatchSize is the batch size for reading parquet records.
	parquetReadBatchSize = 1000
)

// PineconePushProvider implements the PushOperationProvider interface for Pinecone.
type PineconePushProvider struct {
	namespace  *string
	dbInstance *db.Database
	logger     *slog.Logger
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

// readParquetRecords reads embedding records from a parquet file.
func (p *PineconePushProvider) readParquetRecords(tempPath string) ([]pineconeclient.EmbeddingRecord, error) {
	fr, err := local.NewLocalFileReader(tempPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open parquet file: %w", err)
	}
	defer fr.Close()

	pr, err := reader.NewParquetReader(fr, new(ParquetEmbedding), parquetReaderParallelNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to create parquet reader: %w", err)
	}
	defer pr.ReadStop()

	return p.readAllRecords(pr)
}

// readAllRecords reads all records from a parquet reader in batches.
func (p *PineconePushProvider) readAllRecords(
	pr *reader.ParquetReader,
) ([]pineconeclient.EmbeddingRecord, error) {
	numRows := int(pr.GetNumRows())
	records := make([]pineconeclient.EmbeddingRecord, 0, numRows)

	for i := 0; i < numRows; i += parquetReadBatchSize {
		readCount := parquetReadBatchSize
		if i+readCount > numRows {
			readCount = numRows - i
		}

		batchRecords, err := p.readBatch(pr, readCount)
		if err != nil {
			return nil, err
		}
		records = append(records, batchRecords...)
	}

	return records, nil
}

// readBatch reads a batch of records from the parquet reader.
func (p *PineconePushProvider) readBatch(
	pr *reader.ParquetReader,
	readCount int,
) ([]pineconeclient.EmbeddingRecord, error) {
	parquetRecords := make([]ParquetEmbedding, readCount)
	if readErr := pr.Read(&parquetRecords); readErr != nil {
		return nil, fmt.Errorf("failed to read parquet records: %w", readErr)
	}

	records := make([]pineconeclient.EmbeddingRecord, 0, len(parquetRecords))
	for _, pRecord := range parquetRecords {
		record := p.convertParquetRecord(pRecord)
		if len(record.Embedding) == 0 {
			if p.logger != nil {
				p.logger.Warn("skipping record without embedding", "id", record.ID)
			}
			continue
		}
		records = append(records, record)
	}

	return records, nil
}

// convertParquetRecord converts a ParquetEmbedding to an EmbeddingRecord.
func (p *PineconePushProvider) convertParquetRecord(pRecord ParquetEmbedding) pineconeclient.EmbeddingRecord {
	record := pineconeclient.EmbeddingRecord{
		ID:         pRecord.ID,
		SourceFile: pRecord.SourceFile,
		ChunkIndex: int(pRecord.ChunkIndex),
		Content:    pRecord.Content,
		Metadata:   make(map[string]string),
	}

	record.Embedding = p.parseEmbedding(pRecord.Embedding)
	record.Metadata = p.parseMetadata(pRecord.Metadata)
	record.CreatedAt = p.parseCreatedAt(pRecord.CreatedAt)

	return record
}

// parseEmbedding parses an embedding from a JSON string.
func (p *PineconePushProvider) parseEmbedding(embeddingStr string) []float32 {
	if embeddingStr == "" {
		return nil
	}

	var embedding []float32
	if err := json.Unmarshal([]byte(embeddingStr), &embedding); err == nil {
		return embedding
	}

	return parseEmbeddingString(embeddingStr)
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

// parseCreatedAt parses a timestamp from an RFC3339 string.
func (p *PineconePushProvider) parseCreatedAt(createdAtStr string) time.Time {
	if createdAtStr != "" {
		if t, err := time.Parse(time.RFC3339, createdAtStr); err == nil {
			return t
		}
	}
	return time.Now()
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

// OperationPatch is not supported by Pinecone connector.
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Patch operations are not supported by the Pinecone connector. Use push to upsert vectors.",
	})
}
