package utils

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
)

// FilePayload holds the information required for a file field.
type FilePayload struct {
	// FileName is the name of the file as it should appear in the form.
	FileName string
	// Reader provides the file's content.
	Reader io.Reader
}

// CreateMultipartPayload creates a multipart form payload that can contain multiple file fields
// and additional text fields.
//
// fileFields is a map where the key is the form field name and the value is the FilePayload.
// textFields is a map of string key/value pairs to include as form fields.
//
// The function returns a *bytes.Buffer containing the multipart payload, the Content-Type (which includes
// the boundary), and an error if something goes wrong.
func CreateMultipartPayload(
	fileFields map[string]FilePayload,
	textFields map[string]string,
) (*bytes.Buffer, string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add text fields first.
	for field, value := range textFields {
		if writeFieldErr := writer.WriteField(field, value); writeFieldErr != nil {
			return nil, "", fmt.Errorf("failed to write field %q: %w", field, writeFieldErr)
		}
	}

	// Add file fields.
	for field, payload := range fileFields {
		part, createFormFileErr := writer.CreateFormFile(field, payload.FileName)
		if createFormFileErr != nil {
			return nil, "", fmt.Errorf("failed to create form file for field %q: %w", field, createFormFileErr)
		}
		if _, copyErr := io.Copy(part, payload.Reader); copyErr != nil {
			return nil, "", fmt.Errorf("failed to copy content for field %q: %w", field, copyErr)
		}
	}

	// Close the writer to finalise the multipart content.
	if closeErr := writer.Close(); closeErr != nil {
		return nil, "", fmt.Errorf("failed to close multipart writer: %w", closeErr)
	}

	return &buf, writer.FormDataContentType(), nil
}
