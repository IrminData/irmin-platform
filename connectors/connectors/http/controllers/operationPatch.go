package httpcontrollers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/http/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// OperationPatch godoc
// @Summary Apply patch operations via HTTP requests
// @Description Apply JSON Patch operations by making HTTP requests to the configured endpoint. Each patch operation becomes an HTTP request.
// @Tags http
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param patches formData file true "JSON file containing array of patch operations"
// @Success 200 {object} fiber.Map "Patch operations applied successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid patch format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
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
		"HTTP patch operation execution started",
		nil,
	)

	// Initialize HTTP client
	httpClient, err := client.InitHTTPClient(nil, cs.Logger, operation)
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to initialize HTTP client for patch operation",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize HTTP client: " + err.Error(),
		})
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

	// Apply each patch operation via HTTP
	results := make([]map[string]any, 0, len(patches))
	for i, patch := range patches {
		result, patchErr := executeHTTPPatch(httpClient, patch)
		if patchErr != nil {
			common.LogOperationEvent(
				cs.DB,
				cs.Logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to execute HTTP patch operation",
				map[string]any{
					"error":     patchErr.Error(),
					"operation": patch.Op,
					"path":      patch.Path,
					"index":     i,
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf(
					"Failed to execute patch %d (%s on %s): %s",
					i,
					patch.Op,
					patch.Path,
					patchErr.Error(),
				),
				"results": results,
			})
		}

		results = append(results, result)
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeInfo,
			"HTTP patch operation executed",
			map[string]any{
				"operation":   patch.Op,
				"path":        patch.Path,
				"index":       i,
				"status_code": result["status_code"],
			},
		)
	}

	// Log successful completion
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"HTTP patch operation completed successfully",
		map[string]any{"operation_count": len(patches)},
	)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
		"count":   len(patches),
		"results": results,
	})
}

// executeHTTPPatch executes a single HTTP patch operation.
func executeHTTPPatch(httpClient *client.HTTPClient, patch irminmodels.PatchOperation) (map[string]any, error) {
	// Determine HTTP method based on patch operation
	method := operationToHTTPMethod(patch.Op)

	// Build the target URL using WithPath for proper URL path joining
	// This handles edge cases like double slashes and missing separators
	targetClient := httpClient.WithPath(patch.Path)
	targetURL := targetClient.URL

	// Prepare request body
	var body []byte
	var contentType string
	var err error

	if patch.Value != nil {
		body, contentType, err = preparePatchBody(patch)
		if err != nil {
			return nil, err
		}
	}

	// Create the HTTP request
	req, err := http.NewRequestWithContext(context.Background(), method, targetURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Copy headers from the configured client
	for key, value := range httpClient.Headers {
		req.Header.Set(key, value)
	}

	// Set content type if we have a body
	if len(body) > 0 && contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	// Execute the request
	resp, err := httpClient.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, _ := io.ReadAll(resp.Body)

	// Check if the status code is in the accepted range
	if !isAcceptedStatusCode(resp.StatusCode, httpClient.AcceptedStatusCodes) {
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(respBody))
	}

	return map[string]any{
		"status_code": resp.StatusCode,
		"path":        patch.Path,
		"operation":   patch.Op,
	}, nil
}

// operationToHTTPMethod maps JSON Patch operations to HTTP methods.
func operationToHTTPMethod(op string) string {
	switch op {
	case "add":
		return "POST"
	case "remove":
		return "DELETE"
	case "replace":
		return "PUT"
	default:
		return "PATCH"
	}
}

// preparePatchBody prepares the request body from a patch value.
func preparePatchBody(patch irminmodels.PatchOperation) ([]byte, string, error) {
	// Check for binary content
	decodedBytes, isBinary, err := utils.DecodePatchValue(patch)
	if err != nil {
		return nil, "", fmt.Errorf("failed to decode patch value: %w", err)
	}

	if isBinary && patch.ContentType != nil {
		return decodedBytes, *patch.ContentType, nil
	}

	// For non-binary content, serialize as JSON
	if patch.Value != nil {
		jsonBytes, jsonErr := json.Marshal(*patch.Value)
		if jsonErr != nil {
			return nil, "", fmt.Errorf("failed to marshal patch value: %w", jsonErr)
		}
		return jsonBytes, "application/json", nil
	}

	return nil, "", nil
}

// isAcceptedStatusCode checks if a status code is in the accepted list.
func isAcceptedStatusCode(code int, accepted []int) bool {
	if len(accepted) == 0 {
		// Default: accept 2xx status codes
		return code >= 200 && code < 300
	}
	for _, ac := range accepted {
		if ac == code {
			return true
		}
	}
	return false
}
