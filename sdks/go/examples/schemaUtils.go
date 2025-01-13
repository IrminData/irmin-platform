package examples

import (
	"encoding/json"
	"fmt"
	"irmin-sdk/utils"
)

func TestSchemaUtils() {
	// Example JSON schema
	const exampleJSONSchema = `{
		"type": "object",
		"properties": {
		  "Name": { "type": "string" },
		  "Age": { "type": "integer" },
		  "Scores": {
			"type": "array",
			"items": { "type": "number" }
		  }
		},
		"required": ["Name", "Age"]
	  }`

	var schema map[string]interface{}
	if err := json.Unmarshal([]byte(exampleJSONSchema), &schema); err != nil {
		fmt.Println("Error unmarshalling JSON schema:", err)
		return
	}

	// Convert JSON schema to Parquet schema
	fmt.Println("Testing JSONSchemaToParquet...")
	parquetSchema := utils.JSONSchemaToParquet(schema, "example_root")
	fmt.Println("Parquet schema:")
	fmt.Println(parquetSchema)
}
