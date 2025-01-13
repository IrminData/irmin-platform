package utils

import (
	"encoding/json"
	"os"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/reader"
)

func ReadParquetToStruct(parquetData []byte, schema interface{}) ([]interface{}, error) {
	// Write parquetData to a temporary file.
	tmpFile, err := os.CreateTemp("", "temp_parquet_*.parquet")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(parquetData); err != nil {
		return nil, err
	}
	if err := tmpFile.Close(); err != nil {
		return nil, err
	}

	// Create a local file reader for the temporary file.
	fr, err := local.NewLocalFileReader(tmpFile.Name())
	if err != nil {
		return nil, err
	}

	// Create a Parquet reader with the provided schema.
	pr, err := reader.NewParquetReader(fr, schema, 4)
	if err != nil {
		return nil, err
	}
	defer pr.ReadStop()

	// Read all rows from the Parquet data.
	num := int(pr.GetNumRows())
	res, err := pr.ReadByNumber(num)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func ParquetToJSON(parquetData []byte, schema interface{}) (string, error) {
	res, err := ReadParquetToStruct(parquetData, schema)
	if err != nil {
		return "", err
	}

	jsonBs, err := json.Marshal(res)
	if err != nil {
		return "", err
	}

	return string(jsonBs), nil
}
