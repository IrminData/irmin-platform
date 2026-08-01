package firecrawlcontrollers

import (
	"errors"
	"log/slog"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/firecrawl/client"
	"irmin-connectors/connectors/firecrawl/config"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

const contentTypeJSON = "application/json"

// FirecrawlSchemaProvider implements the SchemaOperationProvider interface for Firecrawl.
type FirecrawlSchemaProvider struct {
	APIBaseURL string
	APIToken   string
}

// InitializeClient initializes the Firecrawl client for schema operations.
func (p *FirecrawlSchemaProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	firecrawlClient, err := client.InitFirecrawlClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}
	return firecrawlClient, nil, func() {
		// Firecrawl client doesn't need explicit cleanup
	}, nil
}

// GetSchema retrieves a schema based on the Firecrawl operation type.
// For Firecrawl, the schema is relatively simple since output is always markdown, HTML, or JSON.
func (p *FirecrawlSchemaProvider) GetSchema(
	_ fiber.Ctx,
	clientAny any,
	operationType string,
	_ *string, // path parameter not used for Firecrawl schema
) (*irminmodels.ObjectSchema, error) {
	firecrawlClient, ok := clientAny.(*client.FirecrawlClient)
	if !ok {
		return nil, errors.New("invalid client type for Firecrawl")
	}

	// Determine content type and schema based on output format
	var contentType string
	var schema *irminmodels.JSONSchema

	switch firecrawlClient.OutputFormat {
	case client.OutputFormatHTML:
		contentType = "text/html"
		desc := "HTML content extracted from web page"
		schema = &irminmodels.JSONSchema{
			Type:        "string",
			Description: &desc,
		}
	case client.OutputFormatJSON:
		contentType = contentTypeJSON
		desc := "Structured JSON with content and metadata"
		schema = &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
			Properties: map[string]irminmodels.JSONSchema{
				"url": {
					Type:        "string",
					Description: strPtr("Source URL of the content"),
				},
				"title": {
					Type:        "string",
					Description: strPtr("Page title"),
				},
				"description": {
					Type:        "string",
					Description: strPtr("Page description"),
				},
				"markdown": {
					Type:        "string",
					Description: strPtr("Markdown content"),
				},
				"html": {
					Type:        "string",
					Description: strPtr("HTML content"),
				},
				"links": {
					Type:        "array",
					Description: strPtr("Links found on the page"),
					Items: &irminmodels.JSONSchema{
						Type: "string",
					},
				},
				"metadata": {
					Type:        "object",
					Description: strPtr("Page metadata including Open Graph tags"),
				},
			},
		}
	default: // markdown
		contentType = "text/markdown"
		desc := "Markdown content extracted from web page"
		schema = &irminmodels.JSONSchema{
			Type:        "string",
			Description: &desc,
		}
	}

	// Determine filename based on operation type
	var fileName string
	switch firecrawlClient.OperationType {
	case client.OperationTypeMap:
		fileName = "sitemap.json"
		contentType = contentTypeJSON
		desc := "List of discovered URLs"
		schema = &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
			Properties: map[string]irminmodels.JSONSchema{
				"success": {
					Type: "boolean",
				},
				"source_url": {
					Type: "string",
				},
				"links": {
					Type: "array",
					Items: &irminmodels.JSONSchema{
						Type: "string",
					},
				},
				"count": {
					Type: "integer",
				},
			},
		}
	case client.OperationTypeSearch:
		fileName = "search-results.json"
		contentType = contentTypeJSON
		desc := "Search results from Firecrawl"
		schema = &irminmodels.JSONSchema{
			Type:        "object",
			Description: &desc,
		}
	case client.OperationTypeCrawl:
		fileName = "crawl-results"
	default:
		fileName = "scraped-content"
	}

	// Add extension based on format
	if firecrawlClient.OperationType != client.OperationTypeMap &&
		firecrawlClient.OperationType != client.OperationTypeSearch {
		switch firecrawlClient.OutputFormat {
		case client.OutputFormatHTML:
			fileName += ".html"
		case client.OutputFormatJSON:
			fileName += ".json"
		default:
			fileName += ".md"
		}
	}

	objectSchema := &irminmodels.ObjectSchema{
		Name:        fileName,
		Path:        fileName,
		Type:        irminmodels.ObjectTypeStructured,
		ContentType: &contentType,
		Schema:      schema,
	}

	return objectSchema, nil
}

// GetSupportedOperationTypes returns the list of supported operation types for Firecrawl.
func (p *FirecrawlSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}

// OperationSchemaGet godoc
// @Summary Get Firecrawl operation schema
// @Description Get the response schema for Firecrawl operations, returning an Irmin-compatible ObjectSchema based on the configured operation type and output format
// @Tags firecrawl
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull)
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation type or token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /firecrawl/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &FirecrawlSchemaProvider{
		APIBaseURL: cs.App.Env.SDKBaseURL(),
		APIToken:   cs.App.Env.APIToken,
	}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger, cs.DB, cs.App)
}

// strPtr is a helper to create a pointer to a string.
func strPtr(s string) *string {
	return &s
}
