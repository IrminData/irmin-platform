package schema

import (
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/IrminData/irmin-sdk-go/duckdb"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

const (
	// DefaultSampleSize is the default sample size for schema generation.
	DefaultSampleSize = 1000
)

// Field represents one column or nested field in the DuckDB schema.
// Used internally for DuckDB introspection before converting to JSONSchema.
// Name is the column name or nested field name.
// Type is the DuckDB data type (e.g. "VARCHAR", "STRUCT", or "ARRAY<STRUCT>").
// Required indicates whether the field is non-nullable in DuckDB (is_nullable = 'NO').
// Children holds nested struct fields if this column is a STRUCT or array of STRUCTs.
type Field struct {
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	Required bool    `json:"required"`
	Children []Field `json:"children,omitempty"`
}

// Generator provides schema generation capabilities for in-memory data processing.
type Generator struct {
	duckdbClient *duckdb.InMemoryClient
	logger       *slog.Logger
}

// NewGenerator creates a new schema generator with DuckDB backend.
func NewGenerator(logger *slog.Logger) (*Generator, error) {
	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", err)
	}

	return &Generator{
		duckdbClient: client,
		logger:       logger,
	}, nil
}

// Close closes the underlying DuckDB connection.
func (g *Generator) Close() error {
	if g.duckdbClient != nil {
		return g.duckdbClient.Close()
	}
	return nil
}

// GenerateObjectSchema analyzes file content and generates an ObjectSchema.
// This follows the EXACT same pattern as the Core API's GenerateObjectSchema.
// The only difference: we work with in-memory data instead of S3/LakeFS files.
func (g *Generator) GenerateObjectSchema(
	data []byte,
	filename string,
) (*irminmodels.ObjectSchema, error) {
	if len(data) == 0 {
		return nil, errors.New("no data provided")
	}

	// Parse object details for comprehensive format detection
	objectDetails := irminutils.ParseObjectDetailsFromPath(filename)

	// Check if the format supports structured analysis
	if !g.SupportsStructuredAnalysis(filename) {
		g.logger.Warn("file format does not support structured analysis",
			"filename", filename,
			"content_type", objectDetails.ContentType,
			"object_type", objectDetails.Type)

		// Return basic binary schema like Core API does
		return g.generateBinaryObjectSchema(data, filename, objectDetails), nil
	}

	// Generate a unique table name for this analysis
	tableName := fmt.Sprintf("schema_analysis_%d", time.Now().UnixNano())

	// Load the data into DuckDB
	err := g.duckdbClient.LoadFileFromBytes(data, filename, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to load data into DuckDB: %w", err)
	}

	// Generate structured schema from the loaded table (like Core API)
	return g.generateStructuredObjectSchema(tableName, filename, data, objectDetails)
}

// GenerateObjectSchemaFromData analyzes Go data structures and generates an ObjectSchema.
// This follows the same pattern as the Core API but works with in-memory Go data.
func (g *Generator) GenerateObjectSchemaFromData(
	data []map[string]any,
) (*irminmodels.ObjectSchema, error) {
	if len(data) == 0 {
		return nil, errors.New("no data provided")
	}

	// Create a virtual object details for in-memory data
	objectDetails := irminutils.ObjectDetails{
		Name:        "data",
		FullPath:    "data",
		Type:        irminmodels.ObjectTypeStructured,
		ContentType: "application/json", // Default for in-memory data
	}

	// Generate a unique table name for this analysis
	tableName := fmt.Sprintf("schema_analysis_%d", time.Now().UnixNano())

	// Load the data into DuckDB
	err := g.duckdbClient.CreateTableFromData(tableName, data)
	if err != nil {
		return nil, fmt.Errorf("failed to create table from data: %w", err)
	}

	// Generate structured schema from the loaded table (like Core API)
	return g.generateStructuredObjectSchema(tableName, "", nil, objectDetails)
}

// generateStructuredObjectSchema generates a structured object schema like the Core API.
// This is aligned with the Core API's generateStructuredObjectSchema function.
func (g *Generator) generateStructuredObjectSchema(
	tableName, _ string,
	originalData []byte,
	objectDetails irminutils.ObjectDetails,
) (*irminmodels.ObjectSchema, error) {
	// Get column information from DuckDB (like Core API's getDuckDBSchema)
	duckDBSchema, err := g.getDuckDBSchema(tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get DuckDB schema: %w", err)
	}

	// Calculate size if we have original data
	var size *int
	if originalData != nil {
		s := len(originalData)
		size = &s
	}

	// Build ObjectSchema like the Core API does
	schema := &irminmodels.ObjectSchema{
		Name:        objectDetails.Name,
		Path:        objectDetails.FullPath,
		Type:        objectDetails.Type,
		Size:        size,
		ContentType: &objectDetails.ContentType,
	}

	// Create a JSON schema for the structured object (like Core API)
	jsonSchema := g.buildJSONSchema(duckDBSchema)
	schema.Schema = &jsonSchema

	// Clean up the temporary table
	_, err = g.duckdbClient.ExecuteNonQuery(fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName))
	if err != nil {
		g.logger.Warn("failed to clean up temporary table", "table", tableName, "error", err)
	}

	return schema, nil
}

// getDuckDBSchema runs DuckDB introspection on a table and returns a schema.
// This is IDENTICAL to the Core API's getDuckDBSchema function logic.
func (g *Generator) getDuckDBSchema(tableName string) ([]Field, error) {
	// Query the information schema to get column details
	query := fmt.Sprintf(`
		SELECT column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_schema='main' AND table_name='%s'
		ORDER BY ordinal_position
	`, tableName)

	rows, err := g.duckdbClient.ExecuteQuery(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query schema information: %w", err)
	}
	defer rows.Close()

	var fields []Field
	for rows.Next() {
		var name, dataType, nullable string
		if scanErr := rows.Scan(&name, &dataType, &nullable); scanErr != nil {
			return nil, fmt.Errorf("failed to scan schema row: %w", scanErr)
		}

		required := strings.EqualFold(nullable, "NO")
		field := g.parseField(name, dataType, required)
		fields = append(fields, field)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating schema rows: %w", rowsErr)
	}

	return fields, nil
}

// generateBinaryObjectSchema creates a binary object schema like the Core API.
// This is aligned with the Core API's generateBinaryObjectSchema function.
func (g *Generator) generateBinaryObjectSchema(
	data []byte,
	_ string,
	objectDetails irminutils.ObjectDetails,
) *irminmodels.ObjectSchema {
	size := len(data)
	schema := &irminmodels.ObjectSchema{
		Name:        objectDetails.Name,
		Path:        objectDetails.FullPath,
		Type:        objectDetails.Type,
		Size:        &size,
		ContentType: &objectDetails.ContentType,
	}

	return schema
}

// Backward compatibility functions for existing tests and API consumers
// These wrap the new aligned functions to maintain existing functionality

// GenerateSchemaFromBytes is deprecated - use GenerateObjectSchema instead.
// This exists only for backward compatibility and will be removed.
func (g *Generator) GenerateSchemaFromBytes(data []byte, filename string) (*irminmodels.ObjectSchema, error) {
	return g.GenerateObjectSchema(data, filename)
}

// GenerateSchemaFromData is deprecated - use GenerateObjectSchemaFromData instead.
// This exists only for backward compatibility and will be removed.
func (g *Generator) GenerateSchemaFromData(data []map[string]any) (*irminmodels.ObjectSchema, error) {
	return g.GenerateObjectSchemaFromData(data)
}

// Helper functions for backward compatibility with tests

// GenerationOptions represents legacy options for backward compatibility.
type GenerationOptions struct {
	IncludeJSONSchema bool
	SampleSize        int
	InferTypes        bool
	DetectRequired    bool
}

// DefaultSchemaGenerationOptions returns default options (for test compatibility).
func DefaultSchemaGenerationOptions() GenerationOptions {
	return GenerationOptions{
		IncludeJSONSchema: true,
		SampleSize:        DefaultSampleSize,
		InferTypes:        true,
		DetectRequired:    true,
	}
}

// SupportsStructuredAnalysis checks if the file format supports structured data analysis.
func (g *Generator) SupportsStructuredAnalysis(filename string) bool {
	objectDetails := irminutils.ParseObjectDetailsFromPath(filename)
	return objectDetails.Type == irminmodels.ObjectTypeStructured
}
