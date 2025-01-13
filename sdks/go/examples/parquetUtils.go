package examples

import (
	"fmt"
	"irmin-sdk/utils"
	"os"
)

func TestParquetUtils() {
	// Example JSON data to convert to Parquet
	jsonData := []string{
		`{"Name":"Alice", "Age":25, "Score":90.5}`,
		`{"Name":"Bob", "Age":30, "Score":85.3}`,
		`{"Name":"Charlie", "Age":35, "Score":70.2}`,
		`{"Name":"David", "Age":40, "Score":60.1}`,
	}

	// Define the schema
	parquetSchema := `
	{
		"Tag": "name=example_root, repetitiontype=REQUIRED",
		"Fields": [
			{"Tag": "name=Name, type=BYTE_ARRAY, convertedtype=UTF8, repetitiontype=REQUIRED"},
			{"Tag": "name=Age, type=INT32, repetitiontype=REQUIRED"},
			{"Tag": "name=Score, type=FLOAT, repetitiontype=REQUIRED"}
		]
	}`

	// Convert JSON data to Parquet format
	fmt.Println("Testing ConvertJSONToParquet...")
	parquetData, err := utils.ConvertJSONToParquet(jsonData, parquetSchema, 4)
	if err != nil {
		fmt.Println("Error converting JSON to Parquet:", err)
		return
	}
	fmt.Println("JSON converted to Parquet successfully!")

	// Save the Parquet data to a file
	fmt.Println("Testing SaveParquetToFile...")
	err = os.WriteFile("static/example.parquet", parquetData, 0644)
	if err != nil {
		fmt.Println("Error saving Parquet to file:", err)
		return
	}

	// Convert the Parquet data back to JSON
	fmt.Println("Testing ParquetToJSON...")
	revertedJSON, err := utils.ParquetToJSON(parquetData, nil)
	if err != nil {
		fmt.Println("Error converting Parquet to JSON:", err)
		return
	}
	fmt.Println("Parquet converted back to JSON successfully:")
	fmt.Println(revertedJSON)

	// Define a struct for the schema
	type ExampleSchema struct {
		Name  string  `json:"Name"`
		Age   int32   `json:"Age"`
		Score float32 `json:"Score"`
	}

	// Read Parquet into the struct
	fmt.Println("Testing ReadParquetToStruct...")
	var schema ExampleSchema
	records, err := utils.ReadParquetToStruct(parquetData, &schema)
	if err != nil {
		fmt.Println("Error reading Parquet into struct:", err)
		return
	}
	fmt.Println("Parquet read into struct successfully:")
	for _, record := range records {
		fmt.Printf("%+v\n", record)
	}
}
