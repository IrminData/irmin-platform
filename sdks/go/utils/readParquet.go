package utils

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/reader"
)

func ReadParquetToStruct(parquetData []byte, schema interface{}) ([]interface{}, error) {
	// Write parquetData to a temporary file.
	tmpFile, err := os.CreateTemp("", "temp_parquet_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(parquetData); err != nil {
		return nil, fmt.Errorf("failed to write to temp file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", err)
	}

	// Create a local file reader for the temporary file.
	fr, err := local.NewLocalFileReader(tmpFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to create local file reader: %w", err)
	}
	defer fr.Close()

	// Create a Parquet reader with the provided schema.
	pr, err := reader.NewParquetReader(fr, schema, 4)
	if err != nil {
		return nil, fmt.Errorf("failed to create Parquet reader: %w", err)
	}
	defer pr.ReadStop()

	// Read rows from the Parquet data.
	num := int(pr.GetNumRows())
	res := make([]interface{}, 0, num)
	for i := 0; i < num; i++ {
		row := make([]interface{}, 1)
		err := pr.Read(&row)
		if err != nil {
			return nil, fmt.Errorf("failed to read row %d: %w", i, err)
		}
		res = append(res, row[0])
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
