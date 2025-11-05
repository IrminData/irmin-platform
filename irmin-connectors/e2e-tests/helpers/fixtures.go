package helpers

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	connectorsclient "irmin-connectors/e2e-tests/connectors-client"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateTestFile creates a temporary test file with the given content.
func CreateTestFile(filename string, content []byte) (string, error) {
	tempDir := os.TempDir()
	filePath := filepath.Join(tempDir, filename)

	err := os.WriteFile(filePath, content, 0600)
	if err != nil {
		return "", fmt.Errorf("failed to create test file: %w", err)
	}

	return filePath, nil
}

// CleanupTestFile removes a temporary test file.
func CleanupTestFile(filePath string) error {
	if filePath == "" {
		return nil
	}
	return os.Remove(filePath)
}

// CreatePatchFile creates a JSON patch file for testing.
func CreatePatchFile(patches []irminmodels.PatchOperation) (string, error) {
	patchData, err := json.Marshal(patches)
	if err != nil {
		return "", fmt.Errorf("failed to marshal patches: %w", err)
	}

	return CreateTestFile("test-patches.json", patchData)
}

// CreateFormFile creates a FormFile struct from a file path.
func CreateFormFile(filePath, fieldName string) connectorsclient.FormFile {
	return connectorsclient.FormFile{
		FilePath:  filePath,
		FieldName: fieldName,
		FileName:  filepath.Base(filePath),
	}
}

// CreateFormFileFromBytes creates a FormFile struct from bytes.
func CreateFormFileFromBytes(filename, fieldName string, content []byte) connectorsclient.FormFile {
	return connectorsclient.FormFile{
		Reader:    bytes.NewReader(content),
		FieldName: fieldName,
		FileName:  filename,
	}
}

// CreateSampleParquetData creates sample data for Parquet file testing.
// Note: This is a placeholder. Real implementation would use a Parquet library.
func CreateSampleParquetData() []byte {
	// This is a placeholder - in real implementation, you'd use a Parquet library
	// to create actual Parquet-formatted data
	return []byte("SAMPLE_PARQUET_DATA")
}

const (
	sampleUserID1 = 1
	sampleUserID2 = 2
)

// CreateSampleCSVData creates sample CSV data for testing.
func CreateSampleCSVData() []byte {
	return []byte("id,name,email\n1,Test User,test@example.com\n2,Another User,another@example.com\n")
}

// CreateSampleJSONData creates sample JSON data for testing.
func CreateSampleJSONData() []byte {
	data := []map[string]any{
		{"id": sampleUserID1, "name": "Test User", "email": "test@example.com"},
		{"id": sampleUserID2, "name": "Another User", "email": "another@example.com"},
	}
	jsonData, _ := json.Marshal(data)
	return jsonData
}

// CreateSampleZipFile creates a sample zip file with CSV data for testing.
func CreateSampleZipFile(filename string) (string, error) {
	tempDir := os.TempDir()
	zipPath := filepath.Join(tempDir, filename)

	// Create CSV data
	csvData := CreateSampleCSVData()

	// Create a zip archive
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return "", fmt.Errorf("failed to create zip file: %w", err)
	}
	defer zipFile.Close()

	// Create a new zip writer
	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	// Add the CSV file to the zip
	writer, err := zipWriter.Create("data.csv")
	if err != nil {
		return "", fmt.Errorf("failed to create file in zip: %w", err)
	}

	_, err = writer.Write(csvData)
	if err != nil {
		return "", fmt.Errorf("failed to write data to zip: %w", err)
	}

	return zipPath, nil
}

// WrapFileInZip wraps an existing file in a ZIP archive.
func WrapFileInZip(filePath string) (string, error) {
	tempDir := os.TempDir()
	zipPath := filepath.Join(tempDir, "wrapped-"+filepath.Base(filePath)+".zip")

	// Read the source file
	fileData, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	// Create a zip archive
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return "", fmt.Errorf("failed to create zip file: %w", err)
	}
	defer zipFile.Close()

	// Create a new zip writer
	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	// Add the file to the zip with its original name
	writer, err := zipWriter.Create(filepath.Base(filePath))
	if err != nil {
		return "", fmt.Errorf("failed to create file in zip: %w", err)
	}

	_, err = writer.Write(fileData)
	if err != nil {
		return "", fmt.Errorf("failed to write data to zip: %w", err)
	}

	return zipPath, nil
}
