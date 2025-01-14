package utils

import (
	"fmt"
	"strings"
)

// JSONSchemaToParquet converts a JSON Schema to a Parquet schema.
func JSONSchemaToParquet(jsonSchema map[string]interface{}, baseName string) map[string]interface{} {
	// Resolve any "$ref" in the schema
	jsonSchema, _ = resolveRef(jsonSchema)

	// Start with a base schema Tag
	parquetSchema := map[string]interface{}{
		"Tag":    fmt.Sprintf("name=%s, repetitiontype=REQUIRED", baseName),
		"Fields": []map[string]interface{}{},
	}

	// Safely extract "properties" from the JSON Schema
	properties, _ := extractMap(jsonSchema, "properties")

	// Safely extract "required" array from the JSON Schema
	requiredFields := extractStringArray(jsonSchema, "required")

	// For each property, convert and add to Parquet
	for key, value := range properties {
		fieldSchema, isMap := value.(map[string]interface{})
		if !isMap {
			continue
		}

		parquetField := JSONSchemaToParquetField(key, fieldSchema)

		// If this field is not in the "required" list, make it OPTIONAL
		if !stringInSlice(key, requiredFields) {
			tagVal, _ := parquetField["Tag"].(string)
			parquetField["Tag"] = strings.Replace(
				tagVal,
				"repetitiontype=REQUIRED",
				"repetitiontype=OPTIONAL",
				1,
			)
		}

		// Add field to our list
		parquetSchema["Fields"] = append(
			parquetSchema["Fields"].([]map[string]interface{}),
			parquetField,
		)
	}

	return parquetSchema
}

// JSONSchemaToParquetField converts a JSON Schema field to a Parquet field.
func JSONSchemaToParquetField(name string, jsonField map[string]interface{}) map[string]interface{} {
	// Start with a base field Tag
	parquetField := map[string]interface{}{
		"Tag": fmt.Sprintf("name=%s, repetitiontype=REQUIRED", name),
	}

	// Some expansions: check if this field can be null
	fieldTypes := getTypeList(jsonField["type"])
	if canBeNull(fieldTypes) {
		tagVal, _ := parquetField["Tag"].(string)
		parquetField["Tag"] = strings.Replace(
			tagVal,
			"repetitiontype=REQUIRED",
			"repetitiontype=OPTIONAL",
			1,
		)
	}

	// Look for other JSON Schema attributes
	format, _ := jsonField["format"].(string)
	description, _ := jsonField["description"].(string)
	possibleEnums, hasEnum := jsonField["enum"].([]interface{})

	// You might store additional metadata or documentation if desired:
	if description != "" {
		parquetField["Description"] = description
	}
	if hasEnum {
		// Potentially store a list of allowed values in metadata
		parquetField["EnumValues"] = possibleEnums
	}

	// If "type" is an array, handle it accordingly
	// If "type" is a single value, handle it accordingly
	// If it's multiple types, choose the first non-null to define the underlying type.
	var chosenType string
	for _, t := range fieldTypes {
		if t != "null" {
			chosenType = t
			break
		}
	}

	switch chosenType {
	case "string":
		tagVal, _ := parquetField["Tag"].(string)
		switch format {
		case "date", "date-time":
			// One approach: store as INT64 (timestamp) or a dedicated date type
			// For demonstration, let's store as BYTE_ARRAY but note it might be a datetime
			parquetField["Tag"] = tagVal + ", type=BYTE_ARRAY, convertedtype=UTF8"
			parquetField["LogicalType"] = format
		default:
			// Just a normal UTF-8 string
			parquetField["Tag"] = tagVal + ", type=BYTE_ARRAY, convertedtype=UTF8"
		}

	case "integer":
		tagVal, _ := parquetField["Tag"].(string)
		parquetField["Tag"] = tagVal + ", type=INT64"

	case "number":
		tagVal, _ := parquetField["Tag"].(string)
		if format == "float" {
			parquetField["Tag"] = tagVal + ", type=FLOAT"
		} else {
			parquetField["Tag"] = tagVal + ", type=DOUBLE"
		}

	case "boolean":
		tagVal, _ := parquetField["Tag"].(string)
		parquetField["Tag"] = tagVal + ", type=BOOLEAN"

	case "array":
		// Treat as LIST type
		tagVal, _ := parquetField["Tag"].(string)
		parquetField["Tag"] = tagVal + ", type=LIST"

		items, _ := extractMap(jsonField, "items")
		elementField := JSONSchemaToParquetField("element", items)
		// For arrays, you may choose 'repetitiontype=REPEATED' or use the official 3-level LIST structure in Parquet
		parquetField["Fields"] = []map[string]interface{}{elementField}

	case "object":
		// Nested object
		tagVal, _ := parquetField["Tag"].(string)
		parquetField["Tag"] = tagVal + ", repetitiontype=REQUIRED"

		// Recursively get the nested fields
		nestedFields := JSONSchemaToParquet(jsonField, name)
		parquetField["Fields"] = nestedFields["Fields"]

	default:
		// Unhandled or unknown type. One approach is to store as a string fallback
		tagVal, _ := parquetField["Tag"].(string)
		parquetField["Tag"] = tagVal + ", type=BYTE_ARRAY, convertedtype=UTF8"
	}

	return parquetField
}

// canBeNull checks if "null" is among the types for a field
func canBeNull(fieldTypes []string) bool {
	for _, t := range fieldTypes {
		if t == "null" {
			return true
		}
	}
	return false
}

// getTypeList normalises the type field. "type" can be string or array in JSON Schema.
func getTypeList(t interface{}) []string {
	switch v := t.(type) {
	case string:
		return []string{v}
	case []interface{}:
		var types []string
		for _, item := range v {
			if s, ok := item.(string); ok {
				types = append(types, s)
			}
		}
		return types
	default:
		return []string{}
	}
}

// extractMap is a utility to safely get a map[string]interface{} from a parent map.
func extractMap(parent map[string]interface{}, key string) (map[string]interface{}, bool) {
	val, ok := parent[key]
	if !ok {
		return nil, false
	}
	asMap, ok := val.(map[string]interface{})
	if !ok {
		return nil, false
	}
	return asMap, true
}

// extractStringArray is a utility to safely get a []string from a parent map.
func extractStringArray(parent map[string]interface{}, key string) []string {
	val, ok := parent[key]
	if !ok {
		return nil
	}
	rawList, ok := val.([]interface{})
	if !ok {
		return nil
	}
	var stringList []string
	for _, item := range rawList {
		if s, ok := item.(string); ok {
			stringList = append(stringList, s)
		}
	}
	return stringList
}

// stringInSlice checks if a string is contained in a slice.
func stringInSlice(s string, list []string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

// ResolveRef inspects the top-level schemaMap for a "$ref" key of the form "#/$defs/...",
// then returns the referenced subschema from within schemaMap["$defs"].
// If there's no "$ref" or if it's malformed, we just return schemaMap unchanged.
func resolveRef(schemaMap map[string]interface{}) (map[string]interface{}, error) {
	refVal, ok := schemaMap["$ref"].(string)
	if !ok {
		// No "$ref" found, so just return original schemaMap
		return schemaMap, nil
	}

	// We only handle refs starting with "#/$defs/"
	prefix := "#/$defs/"
	if !strings.HasPrefix(refVal, prefix) {
		// If it's a different kind of ref, e.g. external or #/definitions, handle as you wish
		// For now, just return the original schema
		return schemaMap, nil
	}

	// Strip off "#/$defs/" so we can parse the remainder
	path := strings.TrimPrefix(refVal, prefix)
	// Split the path on "/" in case of nested references, e.g. "#/$defs/Foo/Bar"
	segments := strings.Split(path, "/")

	// Start at the top-level schema map to get $defs
	// Note: we must still keep the top-level so we can navigate properly
	defsVal, ok := schemaMap["$defs"]
	if !ok {
		return schemaMap, fmt.Errorf("no $defs found in top-level schema")
	}
	defs, ok := defsVal.(map[string]interface{})
	if !ok {
		return schemaMap, fmt.Errorf("$defs is not a map[string]interface{}")
	}

	// Navigate into $defs following each segment
	current := defs
	for i, seg := range segments {
		// The referenced entry must be a map
		child, ok := current[seg].(map[string]interface{})
		if !ok {
			return schemaMap, fmt.Errorf("no map entry found at $defs/%s", strings.Join(segments[:i+1], "/"))
		}
		// If this is the last segment, we've arrived
		if i == len(segments)-1 {
			return child, nil
		}
		// Otherwise, continue drilling down
		current = child
	}
	// Shouldn’t reach here, but fallback if needed
	return schemaMap, nil
}
