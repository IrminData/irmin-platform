package examples

import (
	"fmt"
	"irmin-sdk/utils"
)

// Example struct for testing schema operations.
type TestUser struct {
	ID          int                    `json:"id"`
	Name        string                 `json:"name" jsonschema:"title=the name,description=The name of a friend,example=joe,example=lucy,default=alex"`
	Friends     []int                  `json:"friends,omitempty" jsonschema_description:"The list of IDs, omitted when empty"`
	Tags        map[string]interface{} `json:"tags,omitempty" jsonschema_extras:"a=b,foo=bar,foo=bar1"`
	BirthDate   string                 `json:"birth_date,omitempty" jsonschema:"oneof_required=date"`
	YearOfBirth string                 `json:"year_of_birth,omitempty" jsonschema:"oneof_required=year"`
	Metadata    interface{}            `json:"metadata,omitempty" jsonschema:"oneof_type=string;array"`
	FavColour   string                 `json:"fav_color,omitempty" jsonschema:"enum=red,enum=green,enum=blue"`
}

// TestSchemaUtils tests the schema utilities in the SDK.
func TestSchemaUtils() {
	// Create JSON schema from struct
	fmt.Println("Testing JSONSchemaFromStruct...")
	schemaBytes, schemaMap, err := utils.JSONSchemaFromStruct(TestUser{}, "test_user")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("JSON schema:")
	fmt.Println(string(schemaBytes))

	// Convert JSON schema to Parquet schema
	fmt.Println("Testing JSONSchemaToParquet...")
	parquetSchema := utils.JSONSchemaToParquet(schemaMap, "example_root")
	fmt.Println("Parquet schema:")
	fmt.Println(parquetSchema)
}
