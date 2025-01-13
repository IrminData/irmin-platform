package utils

import (
	"bytes"
	"fmt"

	"github.com/xitongsys/parquet-go-source/writerfile"
	"github.com/xitongsys/parquet-go/writer"
)

// ConvertJSONToParquet converts JSON data to Parquet format and returns it as a []byte
func ConvertJSONToParquet(jsonData []string, schema string, parallelism int) ([]byte, error) {
	// Create an in-memory buffer to store Parquet data
	buffer := &bytes.Buffer{}
	fileWriter := writerfile.NewWriterFile(buffer)

	// Create a Parquet JSON writer
	pw, err := writer.NewJSONWriter(schema, fileWriter, int64(parallelism))
	if err != nil {
		return nil, fmt.Errorf("failed to create Parquet writer: %w", err)
	}
	defer fileWriter.Close()

	// Write JSON records to Parquet
	for _, record := range jsonData {
		if err := pw.Write(record); err != nil {
			return nil, fmt.Errorf("failed to write JSON record to Parquet: %w", err)
		}
	}

	// Finalise Parquet writing
	if err := pw.WriteStop(); err != nil {
		return nil, fmt.Errorf("failed to finalise Parquet writing: %w", err)
	}

	return buffer.Bytes(), nil
}
