package utils

import (
	"encoding/json"

	"github.com/invopop/jsonschema"
)

// JSONSchemaFromStruct takes any Go struct and returns an indented JSON Schema as bytes.
func JSONSchemaFromStruct(input interface{}) ([]byte, map[string]interface{}, error) {
	// Reflect the input struct into JSON schema.
	schema := jsonschema.Reflect(input)

	// Schema to JSON with indentation.
	schemaToJSON, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		return nil, nil, err
	}

	// Marshal the schema to JSON.
	schemaJSON, err := json.Marshal(schema)
	if err != nil {
		return nil, nil, err
	}

	// Unmarshal the JSON into a map[string]interface{}.
	var schemaMap map[string]interface{}
	if err := json.Unmarshal(schemaJSON, &schemaMap); err != nil {
		return nil, nil, err
	}

	// Encode the schema to JSON with indentation.
	return schemaToJSON, schemaMap, nil
}
