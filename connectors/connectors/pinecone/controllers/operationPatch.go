package pineconecontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"irmin-connectors/connectors/common"
	pineconeclient "irmin-connectors/connectors/pinecone/client"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// OperationPatch godoc
// @Summary Apply patch operations to Pinecone vectors
// @Description Apply JSON Patch operations to vectors in the Pinecone index. Supports add (upsert), remove (delete), and replace (upsert) operations.
// @Tags pinecone
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param patches formData file true "JSON file containing array of patch operations"
// @Success 200 {object} fiber.Map "Patch operations applied successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid patch format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /pinecone/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	ctx := context.Background()

	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Log operation execution start
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Pinecone patch operation execution started",
		nil,
	)

	// Initialize Pinecone client
	pineconeClient, namespace, err := pineconeclient.InitPineconeClient(nil, cs.Logger, operation)
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to initialize Pinecone client for patch operation",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize Pinecone client: " + err.Error(),
		})
	}
	defer pineconeClient.Close()

	namespaceStr := ""
	if namespace != nil {
		namespaceStr = *namespace
	}

	// Retrieve the patch file from the form
	fileHeader, err := c.FormFile("patches")
	if errors.Is(err, http.ErrMissingFile) {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"No JSON patch file uploaded",
			nil,
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No JSON patch file uploaded with form field 'patches'",
		})
	}
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to retrieve patch file",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve form file: " + err.Error(),
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to open patch file",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open form file: " + err.Error(),
		})
	}
	defer file.Close()

	// Read the patch file
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to read patch file",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read uploaded file: " + err.Error(),
		})
	}

	// Parse the patch operations
	var patches []irminmodels.PatchOperation
	if err = json.Unmarshal(fileBytes, &patches); err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to parse patch operations JSON",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse JSON data: " + err.Error(),
		})
	}

	// Apply each patch operation
	for i, patch := range patches {
		if err = executePineconePatch(ctx, pineconeClient, patch); err != nil {
			common.LogOperationEvent(
				cs.DB,
				cs.Logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to execute Pinecone patch operation",
				map[string]any{
					"error":     err.Error(),
					"operation": patch.Op,
					"path":      patch.Path,
					"index":     i,
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("Failed to execute patch %d (%s on %s): %s", i, patch.Op, patch.Path, err.Error()),
			})
		}

		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Pinecone patch operation executed",
			map[string]any{
				"operation": patch.Op,
				"path":      patch.Path,
				"index":     i,
				"namespace": namespaceStr,
			},
		)
	}

	// Log successful completion
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Pinecone patch operation completed successfully",
		map[string]any{
			"operation_count": len(patches),
			"namespace":       namespaceStr,
		},
	)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
		"count":   len(patches),
	})
}

// executePineconePatch executes a single Pinecone patch operation.
// For Pinecone, the path is expected to be the vector ID (e.g., "/vector-id-123").
func executePineconePatch(
	ctx context.Context,
	client *pineconeclient.PineconeClient,
	patch irminmodels.PatchOperation,
) error {
	// Extract vector ID from path (remove leading slash)
	vectorID := strings.TrimPrefix(patch.Path, "/")
	if vectorID == "" {
		return errors.New("patch path must contain a vector ID")
	}

	switch patch.Op {
	case "add", "replace":
		// For add and replace, we upsert the vector
		return executePineconeUpsert(ctx, client, vectorID, patch)
	case "remove":
		// For remove, we delete the vector
		return client.Delete(ctx, []string{vectorID})
	case "move", "copy":
		// Move and copy don't make sense for vectors - reject these operations
		return fmt.Errorf("operation '%s' is not supported for Pinecone vectors", patch.Op)
	default:
		return fmt.Errorf("unsupported operation: %s", patch.Op)
	}
}

// executePineconeUpsert handles add and replace operations by upserting a vector.
func executePineconeUpsert(
	ctx context.Context,
	client *pineconeclient.PineconeClient,
	vectorID string,
	patch irminmodels.PatchOperation,
) error {
	if patch.Value == nil {
		return errors.New("patch value is required for add/replace operations")
	}

	// Parse the value as an EmbeddingRecord
	record, err := parseEmbeddingFromPatchValue(vectorID, patch.Value)
	if err != nil {
		return fmt.Errorf("failed to parse embedding record: %w", err)
	}

	return client.UpsertSingle(ctx, record)
}

// parseEmbeddingFromPatchValue parses a patch value into an EmbeddingRecord.
// The value can be either:
// 1. A full EmbeddingRecord object
// 2. A map with embedding and optional metadata fields
//
//nolint:gocognit // Parsing structured data requires handling multiple field types
func parseEmbeddingFromPatchValue(vectorID string, value *any) (pineconeclient.EmbeddingRecord, error) {
	record := pineconeclient.EmbeddingRecord{
		ID:        vectorID,
		Metadata:  make(map[string]string),
		CreatedAt: time.Now(),
	}

	if value == nil {
		return record, errors.New("value cannot be nil")
	}

	// Try to convert to a map first
	valueMap, ok := (*value).(map[string]any)
	if !ok {
		// Try JSON marshaling/unmarshaling for type conversion
		jsonBytes, err := json.Marshal(*value)
		if err != nil {
			return record, fmt.Errorf("failed to marshal value: %w", err)
		}
		if err = json.Unmarshal(jsonBytes, &valueMap); err != nil {
			return record, fmt.Errorf("value must be an object with embedding data: %w", err)
		}
	}

	// Parse embedding (required)
	if embeddingRaw, exists := valueMap["embedding"]; exists {
		embedding, err := parseEmbeddingValue(embeddingRaw)
		if err != nil {
			return record, fmt.Errorf("failed to parse embedding: %w", err)
		}
		record.Embedding = embedding
	} else {
		return record, errors.New("embedding field is required")
	}

	// Parse optional fields
	if content, exists := valueMap["content"]; exists {
		if contentStr, isString := content.(string); isString {
			record.Content = contentStr
		}
	}

	if sourceFile, exists := valueMap["source_file"]; exists {
		if sourceFileStr, isString := sourceFile.(string); isString {
			record.SourceFile = sourceFileStr
		}
	}

	if chunkIndex, exists := valueMap["chunk_index"]; exists {
		record.ChunkIndex = parseIntValue(chunkIndex)
	}

	if metadata, exists := valueMap["metadata"]; exists {
		if metadataMap, isMap := metadata.(map[string]any); isMap {
			for k, v := range metadataMap {
				record.Metadata[k] = fmt.Sprintf("%v", v)
			}
		}
	}

	if createdAt, exists := valueMap["created_at"]; exists {
		if createdAtStr, isString := createdAt.(string); isString {
			if t, parseErr := time.Parse(time.RFC3339, createdAtStr); parseErr == nil {
				record.CreatedAt = t
			}
		}
	}

	return record, nil
}

// parseEmbeddingValue parses an embedding from various formats.
func parseEmbeddingValue(raw any) ([]float32, error) {
	switch v := raw.(type) {
	case []float32:
		return v, nil
	case []float64:
		result := make([]float32, len(v))
		for i, val := range v {
			result[i] = float32(val)
		}
		return result, nil
	case []any:
		result := make([]float32, len(v))
		for i, val := range v {
			switch num := val.(type) {
			case float64:
				result[i] = float32(num)
			case float32:
				result[i] = num
			case int:
				result[i] = float32(num)
			case json.Number:
				f, err := num.Float64()
				if err != nil {
					return nil, fmt.Errorf("invalid embedding value at index %d: %w", i, err)
				}
				result[i] = float32(f)
			default:
				return nil, fmt.Errorf("invalid embedding value type at index %d: %T", i, val)
			}
		}
		return result, nil
	case string:
		// Try to parse as JSON array
		var embedding []float32
		if err := json.Unmarshal([]byte(v), &embedding); err != nil {
			return nil, fmt.Errorf("failed to parse embedding string as JSON array: %w", err)
		}
		return embedding, nil
	default:
		return nil, fmt.Errorf("unsupported embedding type: %T", raw)
	}
}

// parseIntValue safely parses an integer from various types.
func parseIntValue(raw any) int {
	switch v := raw.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	case string:
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	case json.Number:
		if i, err := v.Int64(); err == nil {
			return int(i)
		}
	}
	return 0
}
