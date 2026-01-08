package pineconecontrollers

import (
	"log/slog"

	"irmin-connectors/connectors/common"
	pineconeclient "irmin-connectors/connectors/pinecone/client"
	"irmin-connectors/connectors/pinecone/config"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// PineconeSchemaProvider implements the SchemaOperationProvider interface for Pinecone.
type PineconeSchemaProvider struct{}

// InitializeClient initializes the Pinecone client for schema operations.
func (p *PineconeSchemaProvider) InitializeClient(
	_ fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, namespace, err := pineconeclient.InitPineconeClient(nil, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}
	return client, namespace, func() {
		_ = client.Close()
	}, nil
}

// strPtr returns a pointer to a string.
func strPtr(s string) *string {
	return &s
}

// GetSchema retrieves the Pinecone schema and returns an Irmin-compatible ObjectSchema.
func (p *PineconeSchemaProvider) GetSchema(
	_ fiber.Ctx,
	_ any,
	operationType string,
	namespace *string,
) (*irminmodels.ObjectSchema, error) {
	// Pinecone schema is relatively simple - it's a collection of vectors
	// For pull operations, we can describe the output format
	// For push operations, we can describe the expected input format

	ns := ""
	if namespace != nil {
		ns = *namespace
	}
	if ns == "" {
		ns = "default"
	}

	// Define the embedding record schema
	embeddingSchema := irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"id": {
				Type:        "string",
				Description: strPtr("Unique identifier for the embedding record"),
			},
			"source_file": {
				Type:        "string",
				Description: strPtr("Source file path for the embedding"),
			},
			"chunk_index": {
				Type:        "integer",
				Description: strPtr("Index of the chunk within the source file"),
			},
			"content": {
				Type:        "string",
				Description: strPtr("Text content that was embedded"),
			},
			"embedding": {
				Type:        "array",
				Description: strPtr("Vector embedding values (float32 array)"),
			},
			"metadata": {
				Type:        "object",
				Description: strPtr("Additional metadata key-value pairs"),
			},
			"created_at": {
				Type:        "string",
				Description: strPtr("Timestamp when the embedding was created (RFC3339 format)"),
			},
		},
		Required: []string{"id", "embedding"},
	}

	// Array of embeddings schema
	arraySchema := irminmodels.JSONSchema{
		Type:  "array",
		Items: &embeddingSchema,
	}

	var children []irminmodels.ObjectSchema
	ct := "application/octet-stream"

	if operationType == "pull" {
		// Pull can return either search results (JSON) or full vectors (parquet)
		searchCT := "application/json"
		children = append(children, irminmodels.ObjectSchema{
			Name:        "search_results.json",
			Path:        ns + "/search_results.json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: &searchCT,
			Schema: &irminmodels.JSONSchema{
				Type: "object",
				Properties: map[string]irminmodels.JSONSchema{
					"query": {
						Type:        "string",
						Description: strPtr("The search query text"),
					},
					"matches": {
						Type: "array",
						Items: &irminmodels.JSONSchema{
							Type: "object",
							Properties: map[string]irminmodels.JSONSchema{
								"id":       {Type: "string"},
								"score":    {Type: "number"},
								"metadata": {Type: "object"},
							},
						},
					},
				},
			},
		})

		children = append(children, irminmodels.ObjectSchema{
			Name:        "embeddings.parquet",
			Path:        ns + "/embeddings.parquet",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: &ct,
			Schema:      &arraySchema,
		})
	} else {
		// Push expects parquet files
		children = append(children, irminmodels.ObjectSchema{
			Name:        "embeddings.parquet",
			Path:        ns + "/embeddings.parquet",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: &ct,
			Schema:      &arraySchema,
		})
	}

	// Assemble group schema
	group := irminmodels.ObjectSchema{
		Type:     irminmodels.ObjectTypeGroup,
		Name:     ns,
		Path:     ns,
		Children: children,
	}

	return &group, nil
}

// GetSupportedOperationTypes returns the list of supported operation types for Pinecone.
func (p *PineconeSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}

// OperationSchemaGet godoc
// @Summary Get Pinecone operation schema
// @Description Get the schema for Pinecone operations, returning an Irmin-compatible ObjectSchema
// @Tags pinecone
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
// @Router /pinecone/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &PineconeSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger, cs.DB)
}
