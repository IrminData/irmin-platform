package schema

import (
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// parseField constructs a Field recursively from its name, type and required flag.
// This is adapted from the Core API's getDuckDBSchema.go to handle nested structures.
func (g *Generator) parseField(name, typ string, required bool) Field {
	// handle array of structs
	if strings.HasPrefix(typ, "STRUCT(") && strings.HasSuffix(typ, ")[]") {
		// treat as array of struct
		nested := typ[len("STRUCT(") : len(typ)-3] // drop STRUCT( ... )[]
		fields := splitTopLevelComma(nested)
		children := make([]Field, 0, len(fields))
		for _, f := range fields {
			parts := strings.Fields(strings.TrimSpace(f))
			if len(parts) < minFieldParts {
				continue
			}
			childName := parts[0]
			childType := strings.Join(parts[1:], " ")
			children = append(children, g.parseField(childName, childType, required))
		}
		return Field{Name: name, Type: "ARRAY<STRUCT>", Required: required, Children: children}
	}
	// handle struct
	if strings.HasPrefix(typ, "STRUCT(") && strings.HasSuffix(typ, ")") {
		nested := typ[len("STRUCT(") : len(typ)-1]
		fields := splitTopLevelComma(nested)
		children := make([]Field, 0, len(fields))
		for _, f := range fields {
			parts := strings.Fields(strings.TrimSpace(f))
			if len(parts) < minFieldParts {
				continue
			}
			childName := parts[0]
			childType := strings.Join(parts[1:], " ")
			children = append(children, g.parseField(childName, childType, required))
		}
		return Field{Name: name, Type: "STRUCT", Required: required, Children: children}
	}
	// primitive or other types
	return Field{Name: name, Type: typ, Required: required}
}

// minFieldParts is the minimum number of parts required for a valid field definition.
const minFieldParts = 2

// splitTopLevelComma splits a STRUCT(...) definition by commas at top-level only,
// ignoring commas inside nested parentheses.
func splitTopLevelComma(s string) []string {
	var parts []string
	var buf strings.Builder
	depth := 0
	for _, r := range s {
		switch r {
		case '(':
			depth++
			buf.WriteRune(r)
		case ')':
			depth--
			buf.WriteRune(r)
		case ',':
			if depth == 0 {
				parts = append(parts, buf.String())
				buf.Reset()
			} else {
				buf.WriteRune(r)
			}
		default:
			buf.WriteRune(r)
		}
	}
	if buf.Len() > 0 {
		parts = append(parts, buf.String())
	}
	return parts
}

// buildJSONSchema constructs a JSON Schema representation from schema fields.
// This implementation is aligned with the Core API approach in irmin/engine/duckDBToJSONSchema.go.
func (g *Generator) buildJSONSchema(fields []Field) irminmodels.JSONSchema {
	js := irminmodels.JSONSchema{
		Type:       "object",
		Properties: make(map[string]irminmodels.JSONSchema),
		Required:   []string{},
	}

	for _, field := range fields {
		js.Properties[field.Name] = g.schemaForField(field)
		if field.Required {
			js.Required = append(js.Required, field.Name)
		}
	}

	return js
}

// schemaForField builds a JSONSchema for a single Field, handling
// recursion into nested STRUCTs and arrays. This is aligned with the Core API approach.
func (g *Generator) schemaForField(field Field) irminmodels.JSONSchema {
	// 1) ARRAY types - handle both ARRAY<TYPE> and TYPE[] formats
	if g.isArrayType(field.Type) {
		return g.buildArraySchema(field)
	}

	// 2) STRUCT → object
	if field.Type == "STRUCT" {
		props := make(map[string]irminmodels.JSONSchema, len(field.Children))
		var req []string

		for _, child := range field.Children {
			props[child.Name] = g.schemaForField(child)
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

	// 3) Primitive types
	return g.primitiveSchema(field.Type)
}

// primitiveSchema maps a DuckDB type into a JSONSchema for a primitive.
// This is aligned with the Core API's primitiveSchema function.
func (g *Generator) primitiveSchema(duckType string) irminmodels.JSONSchema {
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
	case "BLOB":
		// For binary data
		return irminmodels.JSONSchema{Type: "string", Format: stringPtr("binary")}
	default:
		return irminmodels.JSONSchema{Type: "string"}
	}
}

// stringPtr is a helper to get a *string for format fields.
func stringPtr(s string) *string {
	return &s
}

// isArrayType checks if the field type represents an array.
func (g *Generator) isArrayType(fieldType string) bool {
	return strings.HasPrefix(fieldType, "ARRAY<") || strings.HasSuffix(fieldType, "[]")
}

// buildArraySchema builds a JSON schema for array types.
func (g *Generator) buildArraySchema(field Field) irminmodels.JSONSchema {
	var items irminmodels.JSONSchema

	// For array of structs, recurse into children
	if len(field.Children) > 0 {
		items = g.schemaForField(Field{
			Name:     field.Name,
			Type:     "STRUCT",
			Children: field.Children,
			Required: true, // array items always present if field itself is required
		})
	} else {
		// Extract primitive type from ARRAY<TYPE> or TYPE[]
		primType := g.extractPrimitiveType(field.Type)
		items = g.primitiveSchema(primType)
	}

	schema := irminmodels.JSONSchema{
		Type:  "array",
		Items: &items,
	}
	if field.Required {
		minLen := 1
		schema.MinLength = &minLen
	}
	return schema
}

// extractPrimitiveType extracts the primitive type from array notation.
func (g *Generator) extractPrimitiveType(fieldType string) string {
	if strings.HasPrefix(fieldType, "ARRAY<") {
		return strings.TrimSuffix(strings.TrimPrefix(fieldType, "ARRAY<"), ">")
	}
	return strings.TrimSuffix(fieldType, "[]")
}
