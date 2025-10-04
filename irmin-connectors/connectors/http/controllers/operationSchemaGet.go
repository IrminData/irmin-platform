package httpcontrollers

import (
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"irmin-connectors/connectors/common"
	httpclient "irmin-connectors/connectors/http/client"
	"irmin-connectors/connectors/http/config"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// HTTPSchemaProvider implements the SchemaOperationProvider interface for HTTP endpoints.
type HTTPSchemaProvider struct{}

// InitializeClient initializes the HTTP client for schema operations.
func (p *HTTPSchemaProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, err := httpclient.InitHTTPClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}
	return client, nil, func() {
		// HTTP client doesn't need explicit cleanup
	}, nil
}

// GetSchema retrieves the HTTP endpoint schema and returns an Irmin-compatible ObjectSchema.
func (p *HTTPSchemaProvider) GetSchema(
	c fiber.Ctx,
	client any,
	_ string,
	_ *string,
) (*irminmodels.ObjectSchema, error) {
	httpClient, ok := client.(*httpclient.HTTPClient)
	if !ok {
		return nil, errors.New("invalid client type for HTTP")
	}

	// Make a request to get the response structure
	resp, err := httpClient.MakeRequest()
	if err != nil {
		return nil, fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check if status code is accepted
	if !httpClient.IsAcceptedStatusCode(resp.StatusCode) {
		errorBody, errorBodyErr := httpClient.GetResponseBody(resp)
		if errorBodyErr != nil {
			return nil, fmt.Errorf("HTTP request returned unaccepted status %d: %s, failed to read error response: %w",
				resp.StatusCode, resp.Status, errorBodyErr)
		}
		return nil, fmt.Errorf("HTTP request returned unaccepted status %d: %s, response: %s",
			resp.StatusCode, resp.Status, string(errorBody))
	}

	// Get content type
	contentType := httpClient.GetContentType(resp)

	// Generate filename
	fileName := httpClient.GetFileNameFromResponse(resp)

	// For HTTP connectors, we create a schema based on the response content type
	// Use the SDK's content type detection to determine the appropriate schema
	schema := createSchemaFromContentType(contentType)

	// Create the object schema
	objectSchema := &irminmodels.ObjectSchema{
		Name:        fileName,
		Path:        fileName,
		Type:        irminmodels.ObjectTypeStructured,
		ContentType: &contentType,
		Schema:      schema,
	}

	return objectSchema, nil
}

// GetSupportedOperationTypes returns the list of supported operation types for HTTP.
func (p *HTTPSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}

// OperationSchemaGet godoc
// @Summary Get HTTP operation schema
// @Description Get the response schema for HTTP operations, returning an Irmin-compatible ObjectSchema based on the operation type (pull or push)
// @Tags http
// @Security OperationTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull, push)
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation type or token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &HTTPSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger)
}

// createSchemaFromContentType creates an appropriate JSON schema based on content type
func createSchemaFromContentType(contentType string) *irminmodels.JSONSchema {
	// Strip parameters from content type for comparison
	baseContentType := strings.Split(contentType, ";")[0]
	baseContentType = strings.TrimSpace(baseContentType)

	// Direct content type matching for structured data formats
	switch baseContentType {
	case "application/json":
		desc := "JSON response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"data": {
					Type:        "object",
					Description: &desc,
				},
			},
		}

	case "application/xml", "text/xml":
		desc := "XML response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "string",
			Description: &desc,
		}

	case "text/csv", "application/csv":
		desc := "CSV response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type: "array",
			Items: &irminmodels.JSONSchema{
				Type:        "object",
				Description: &desc,
			},
		}

	case "text/tab-separated-values", "application/tsv":
		desc := "TSV response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type: "array",
			Items: &irminmodels.JSONSchema{
				Type:        "object",
				Description: &desc,
			},
		}

	case "application/jsonl", "application/x-ndjson", "application/ndjson":
		desc := "JSONL/NDJSON response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type: "array",
			Items: &irminmodels.JSONSchema{
				Type:        "object",
				Description: &desc,
			},
		}

	case "application/vnd.apache.parquet":
		desc := "Parquet response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
		}

	case "application/vnd.apache.avro", "application/avro":
		desc := "Avro response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
		}

	case "application/vnd.apache.orc":
		desc := "ORC response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
		}

	case "application/x-delta-lake":
		desc := "Delta Lake response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
		}

	case "application/x-iceberg":
		desc := "Iceberg response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
		}

	case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-excel",
		"application/vnd.ms-excel.sheet.macroEnabled.12",
		"application/vnd.ms-excel.sheet.binary.macroEnabled.12":
		desc := "Spreadsheet response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type: "array",
			Items: &irminmodels.JSONSchema{
				Type:        "object",
				Description: &desc,
			},
		}

	case "application/x-yaml", "text/yaml", "application/yaml":
		desc := "YAML response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
		}

	case "text/html", "application/xhtml+xml":
		desc := "HTML response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "string",
			Description: &desc,
		}

	case "text/plain":
		desc := "Plain text response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "string",
			Description: &desc,
		}

	default:
		// For unknown content types, use generic binary/string schema
		desc := "Response from HTTP endpoint"
		return &irminmodels.JSONSchema{
			Type:        "string",
			Description: &desc,
		}
	}
}
