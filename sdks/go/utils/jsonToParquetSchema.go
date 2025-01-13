package utils

import (
	"fmt"
	"strings"
)

// JSONSchemaToParquet converts a JSON Schema to a Parquet schema
func JSONSchemaToParquet(jsonSchema map[string]interface{}, baseName string) map[string]interface{} {
	// Base Parquet schema
	parquetSchema := map[string]interface{}{
		"Tag":    fmt.Sprintf("name=%s, repetitiontype=REQUIRED", baseName),
		"Fields": []map[string]interface{}{},
	}

	// Process the "properties" section of the JSON Schema
	properties, ok := jsonSchema["properties"].(map[string]interface{})
	if !ok {
		return parquetSchema // Return an empty schema if "properties" is missing or invalid
	}

	for key, value := range properties {
		jsonField := value.(map[string]interface{})
		// Initialize the Tag field as a string
		parquetField := map[string]interface{}{
			"Tag": fmt.Sprintf("name=%s, repetitiontype=REQUIRED", key),
		}

		// Handle JSON Schema field types
		switch jsonField["type"] {
		case "string":
			parquetField["Tag"] = parquetField["Tag"].(string) + ", type=BYTE_ARRAY, convertedtype=UTF8"
		case "integer":
			parquetField["Tag"] = parquetField["Tag"].(string) + ", type=INT32"
		case "number":
			parquetField["Tag"] = parquetField["Tag"].(string) + ", type=FLOAT"
		case "boolean":
			parquetField["Tag"] = parquetField["Tag"].(string) + ", type=BOOLEAN"
		case "array":
			// Handle arrays as LIST types in Parquet
			parquetField["Tag"] = parquetField["Tag"].(string) + ", type=LIST"
			items := jsonField["items"].(map[string]interface{})
			element := JSONSchemaToParquetField("element", items)
			parquetField["Fields"] = []map[string]interface{}{element}
		case "object":
			// Handle nested objects as GROUP types in Parquet
			parquetField["Tag"] = parquetField["Tag"].(string) + ", repetitiontype=REQUIRED"
			nestedFields := JSONSchemaToParquet(jsonField, key)
			parquetField["Fields"] = nestedFields["Fields"]
		}

		// Check for optional fields in JSON Schema
		if required, ok := jsonSchema["required"].([]interface{}); ok {
			isRequired := false
			for _, req := range required {
				if req == key {
					isRequired = true
					break
				}
			}
			if !isRequired {
				parquetField["Tag"] = strings.Replace(parquetField["Tag"].(string), "repetitiontype=REQUIRED", "repetitiontype=OPTIONAL", 1)
			}
		}

		// Append the field to the main Parquet schema
		parquetSchema["Fields"] = append(parquetSchema["Fields"].([]map[string]interface{}), parquetField)
	}

	return parquetSchema
}

// JSONSchemaToParquetField converts a JSON Schema field to a Parquet field
func JSONSchemaToParquetField(name string, jsonField map[string]interface{}) map[string]interface{} {
	parquetField := map[string]interface{}{
		"Tag": fmt.Sprintf("name=%s, repetitiontype=REQUIRED", name),
	}

	switch jsonField["type"] {
	case "string":
		parquetField["Tag"] = parquetField["Tag"].(string) + ", type=BYTE_ARRAY, convertedtype=UTF8"
	case "integer":
		parquetField["Tag"] = parquetField["Tag"].(string) + ", type=INT32"
	case "number":
		parquetField["Tag"] = parquetField["Tag"].(string) + ", type=FLOAT"
	case "boolean":
		parquetField["Tag"] = parquetField["Tag"].(string) + ", type=BOOLEAN"
	case "array":
		parquetField["Tag"] = parquetField["Tag"].(string) + ", type=LIST"
		items := jsonField["items"].(map[string]interface{})
		element := JSONSchemaToParquetField("element", items)
		parquetField["Fields"] = []map[string]interface{}{element}
	case "object":
		parquetField["Tag"] = parquetField["Tag"].(string) + ", repetitiontype=REQUIRED"
		nestedFields := JSONSchemaToParquet(jsonField, name)
		parquetField["Fields"] = nestedFields["Fields"]
	}

	return parquetField
}
