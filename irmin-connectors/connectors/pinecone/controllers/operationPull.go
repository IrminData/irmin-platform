package pineconecontrollers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"os"
	"time"

	"irmin-connectors/connectors/common"
	pineconeclient "irmin-connectors/connectors/pinecone/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/parquet"
	"github.com/xitongsys/parquet-go/writer"
)

const (
	// parquetParallelNumber is the number of parallel goroutines for parquet operations.
	parquetParallelNumber = 4
	// parquetRowGroupSize is the row group size in bytes for parquet files (128MB).
	parquetRowGroupSize = 128 * 1024 * 1024
)

// PineconePullProvider implements the PullOperationProvider interface for Pinecone.
type PineconePullProvider struct {
	namespace  *string
	dbInstance *db.Database
	logger     *slog.Logger
}

// getNamespaceValue returns the namespace value or empty string if nil.
func (p *PineconePullProvider) getNamespaceValue() string {
	if p.namespace == nil {
		return ""
	}
	return *p.namespace
}

// ParquetEmbedding represents an embedding record for parquet serialization.
type ParquetEmbedding struct {
	ID         string `parquet:"name=id, type=BYTE_ARRAY, convertedtype=UTF8"`
	SourceFile string `parquet:"name=source_file, type=BYTE_ARRAY, convertedtype=UTF8"`
	ChunkIndex int32  `parquet:"name=chunk_index, type=INT32"`
	Content    string `parquet:"name=content, type=BYTE_ARRAY, convertedtype=UTF8"`
	Embedding  string `parquet:"name=embedding, type=BYTE_ARRAY, convertedtype=UTF8"`
	Metadata   string `parquet:"name=metadata, type=BYTE_ARRAY, convertedtype=UTF8"`
	CreatedAt  string `parquet:"name=created_at, type=BYTE_ARRAY, convertedtype=UTF8"`
}

// InitializeClient initializes the Pinecone client for pull operations.
func (p *PineconePullProvider) InitializeClient(
	_ fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, namespace, err := pineconeclient.InitPineconeClient(nil, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}

	p.namespace = namespace
	p.logger = logger

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

// convertChunkIndexSafely converts a chunk index to int32 with bounds checking and logging.
func (p *PineconePullProvider) convertChunkIndexSafely(chunkIndex int, recordID string) int32 {
	result := int32(chunkIndex) //nolint:gosec // checked for overflow below
	if chunkIndex > math.MaxInt32 {
		result = math.MaxInt32
		if p.logger != nil {
			p.logger.Warn("chunk index exceeds int32 max, clamping to max value",
				"record_id", recordID,
				"original_value", chunkIndex,
			)
		}
	} else if chunkIndex < math.MinInt32 {
		result = math.MinInt32
		if p.logger != nil {
			p.logger.Warn("chunk index below int32 min, clamping to min value",
				"record_id", recordID,
				"original_value", chunkIndex,
			)
		}
	}
	return result
}

// recordsToParquet converts EmbeddingRecords to parquet bytes.
func (p *PineconePullProvider) recordsToParquet(records []pineconeclient.EmbeddingRecord) ([]byte, error) {
	if len(records) == 0 {
		return nil, errors.New("no records to convert")
	}

	// Create a temporary file for parquet writing
	tempFile, err := os.CreateTemp("", "pinecone_embeddings_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Create parquet writer
	fw, err := local.NewLocalFileWriter(tempPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file writer: %w", err)
	}

	pw, err := writer.NewParquetWriter(fw, new(ParquetEmbedding), parquetParallelNumber)
	if err != nil {
		_ = fw.Close()
		return nil, fmt.Errorf("failed to create parquet writer: %w", err)
	}

	pw.RowGroupSize = parquetRowGroupSize
	pw.CompressionType = parquet.CompressionCodec_ZSTD

	// Write records
	for _, record := range records {
		// Convert embedding to string representation
		embeddingBytes, marshalErr := json.Marshal(record.Embedding)
		if marshalErr != nil {
			_ = pw.WriteStop()
			_ = fw.Close()
			return nil, fmt.Errorf("failed to marshal embedding for record %s: %w", record.ID, marshalErr)
		}

		// Convert metadata to JSON string
		metadataBytes, marshalErr := json.Marshal(record.Metadata)
		if marshalErr != nil {
			_ = pw.WriteStop()
			_ = fw.Close()
			return nil, fmt.Errorf("failed to marshal metadata for record %s: %w", record.ID, marshalErr)
		}

		// Safe conversion of chunk index - clamp to int32 range with warning
		chunkIndex := p.convertChunkIndexSafely(record.ChunkIndex, record.ID)

		parquetRecord := ParquetEmbedding{
			ID:         record.ID,
			SourceFile: record.SourceFile,
			ChunkIndex: chunkIndex,
			Content:    record.Content,
			Embedding:  string(embeddingBytes),
			Metadata:   string(metadataBytes),
			CreatedAt:  record.CreatedAt.Format(time.RFC3339),
		}

		if writeErr := pw.Write(parquetRecord); writeErr != nil {
			_ = pw.WriteStop()
			_ = fw.Close()
			return nil, fmt.Errorf("failed to write record: %w", writeErr)
		}
	}

	if err = pw.WriteStop(); err != nil {
		_ = fw.Close()
		return nil, fmt.Errorf("failed to finish writing: %w", err)
	}
	if closeErr := fw.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close file writer: %w", closeErr)
	}

	// Read the parquet file
	data, err := os.ReadFile(tempPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read parquet file: %w", err)
	}

	return data, nil
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
