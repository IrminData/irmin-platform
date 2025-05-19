package engine

import (
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// buildJSONSchema converts a flat slice of SchemaField into a JSONSchema
// representing an object whose properties match the fields.
//
//   - fields: the result of getDuckDBSchema(...)
//     ↪︎ returns: a JSONSchema with Type="object", Properties and Required
func buildJSONSchema(fields []SchemaField) irminmodels.JSONSchema {
	js := irminmodels.JSONSchema{
		Type:       "object",
		Properties: map[string]irminmodels.JSONSchema{},
		Required:   []string{},
	}

	for _, f := range fields {
		js.Properties[f.Name] = schemaForField(f)
		if f.Required {
			js.Required = append(js.Required, f.Name)
		}
	}

	return js
}

// schemaForField builds a JSONSchema for a single SchemaField, handling
// recursion into nested STRUCTs and arrays, and carrying through Required.
func schemaForField(f SchemaField) irminmodels.JSONSchema {
	// 1) ARRAY types
	if strings.HasPrefix(f.Type, "ARRAY<") {
		var items irminmodels.JSONSchema
		// for array of structs, recurse into children
		if len(f.Children) > 0 {
			items = schemaForField(SchemaField{
				Name:     f.Name,
				Type:     "STRUCT",
				Children: f.Children,
				Required: true, // array items always present if field itself is required
			})
		} else {
			primType := strings.TrimSuffix(f.Type, "[]")
			items = primitiveSchema(primType)
		}
		schema := irminmodels.JSONSchema{
			Type:  "array",
			Items: &items,
		}
		if f.Required {
			schema.MinLength = ptrInt(1)
		}
		return schema
	}

	// 2) STRUCT → object
	if f.Type == "STRUCT" {
		props := make(map[string]irminmodels.JSONSchema, len(f.Children))
		req := []string{}
		for _, child := range f.Children {
			props[child.Name] = schemaForField(child)
			if child.Required {
				req = append(req, child.Name)
			}
		}
		schema := irminmodels.JSONSchema{
			Type:       "object",
			Properties: props,
		}
		if len(req) > 0 {
			schema.Required = req
		}
		return schema
	}

	// 3) primitive or JSON
	schema := primitiveSchema(f.Type)

	return schema
}

// ptrInt is a small helper to get a *int for MinLength/MaxLength.
func ptrInt(v int) *int { return &v }

// primitiveSchema maps a DuckDB type into a JSONSchema for a primitive.
func primitiveSchema(duckType string) irminmodels.JSONSchema {
	switch dt := strings.ToUpper(duckType); dt {
	case "VARCHAR", "TEXT":
		return irminmodels.JSONSchema{Type: "string"}
	case "BOOLEAN":
		return irminmodels.JSONSchema{Type: "boolean"}
	case "TINYINT", "SMALLINT", "INTEGER", "BIGINT":
		return irminmodels.JSONSchema{Type: "integer"}
	case "FLOAT", "DOUBLE", "REAL", "DECIMAL":
		return irminmodels.JSONSchema{Type: "number"}
	case "TIMESTAMP", "TIMESTAMP_LTZ", "TIMESTAMP_NTZ", "DATETIME":
		format := "date-time"
		return irminmodels.JSONSchema{Type: "string", Format: &format}
	case "DATE":
		format := "date"
		return irminmodels.JSONSchema{Type: "string", Format: &format}
	case "JSON":
		return irminmodels.JSONSchema{
			Type:                 "object",
			AdditionalProperties: true,
		}
	default:
		return irminmodels.JSONSchema{Type: "string"}
	}
}
