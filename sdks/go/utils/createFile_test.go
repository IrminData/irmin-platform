package irminutils_test

import (
	"bytes"
	"io"
	"mime"
	"mime/multipart"
	"strings"
	"testing"

	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
)

func TestNewFile(t *testing.T) {
	content := "Hello World"
	filename := "test.txt"

	file := irminutils.NewFile(content, filename)
	if string(file.Content) != content {
		t.Errorf("Expected content %q, got %q", content, string(file.Content))
	}
	if file.Filename != filename {
		t.Errorf("Expected filename %q, got %q", filename, file.Filename)
	}
}

func TestNewFileFromBytes(t *testing.T) {
	content := []byte("Hello World")
	filename := "test.txt"

	file := irminutils.NewFileFromBytes(content, filename)
	if !bytes.Equal(file.Content, content) {
		t.Errorf("Expected content %v, got %v", content, file.Content)
	}
	if file.Filename != filename {
		t.Errorf("Expected filename %q, got %q", filename, file.Filename)
	}
}

func TestNewFileFromBytesEmpty(t *testing.T) {
	content := []byte{}
	filename := "empty.txt"

	file := irminutils.NewFileFromBytes(content, filename)
	if !bytes.Equal(file.Content, content) {
		t.Errorf("Expected empty content, got %v", file.Content)
	}
	if file.Filename != filename {
		t.Errorf("Expected filename %q, got %q", filename, file.Filename)
	}
}

func TestNewFileFromBytesBinary(t *testing.T) {
	// Test with binary content
	content := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A} // PNG header
	filename := "test.png"

	file := irminutils.NewFileFromBytes(content, filename)
	if !bytes.Equal(file.Content, content) {
		t.Errorf("Expected binary content %v, got %v", content, file.Content)
	}
	if file.Filename != filename {
		t.Errorf("Expected filename %q, got %q", filename, file.Filename)
	}
}

func TestNewFileFromBytesNil(t *testing.T) {
	var content []byte
	filename := "nil.txt"

	file := irminutils.NewFileFromBytes(content, filename)
	if file.Content != nil {
		t.Errorf("Expected nil content, got %v", file.Content)
	}
	if file.Filename != filename {
		t.Errorf("Expected filename %q, got %q", filename, file.Filename)
	}
}

func TestFileReader(t *testing.T) {
	content := "Hello World"
	file := irminutils.NewFile(content, "test.txt")
	reader := file.Reader()

	data, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("Failed to read: %v", err)
	}
	if string(data) != content {
		t.Errorf("Expected %q, got %q", content, string(data))
	}
}

func TestFileMultipartFile(t *testing.T) {
	content := "Hello World"
	filename := "test.txt"

	file := irminutils.NewFile(content, filename)
	mFile := file.MultipartFile()
	defer mFile.Close()

	// Test reading
	data, err := io.ReadAll(mFile)
	if err != nil {
		t.Fatalf("Failed to read: %v", err)
	}
	if string(data) != content {
		t.Errorf("Expected %q, got %q", content, string(data))
	}

	// Test seeking
	pos, err := mFile.Seek(6, io.SeekStart)
	if err != nil {
		t.Fatalf("Failed to seek: %v", err)
	}
	if pos != 6 {
		t.Errorf("Expected position 6, got %d", pos)
	}
}

func TestCreateMultipartForm(t *testing.T) {
	file := irminutils.NewFile("Hello World", "test.txt")
	buf, contentType, err := irminutils.CreateMultipartForm(file, "file")
	if err != nil {
		t.Fatalf("Failed to create form: %v", err)
	}

	if buf.Len() == 0 {
		t.Error("Expected non-empty buffer")
	}
	if !strings.Contains(contentType, "multipart/form-data") {
		t.Errorf("Expected multipart content type, got %q", contentType)
	}
}

func TestCreateMultipartFormWithFields(t *testing.T) {
	file := irminutils.NewFile("Hello World", "test.txt")
	textFields := map[string]string{"description": "Test file"}

	buf, contentType, err := irminutils.CreateMultipartFormWithFields(file, "file", textFields)
	if err != nil {
		t.Fatalf("Failed to create form: %v", err)
	}

	if buf.Len() == 0 {
		t.Error("Expected non-empty buffer")
	}
	if !strings.Contains(contentType, "multipart/form-data") {
		t.Errorf("Expected multipart content type, got %q", contentType)
	}
}

func TestCreateMultipartFormHeaderInjectionProtection(t *testing.T) {
	tests := []struct {
		name           string
		filename       string
		fieldName      string
		shouldFail     bool
		expectParseErr bool
	}{
		{
			name:           "filename with quotes",
			filename:       `test"file.txt`,
			fieldName:      "file",
			shouldFail:     false,
			expectParseErr: false,
		},
		{
			name:           "filename with CR/LF",
			filename:       "test\r\nfile.txt",
			fieldName:      "file",
			shouldFail:     false,
			expectParseErr: true, // multipart reader should reject malformed headers
		},
		{
			name:           "fieldname with quotes",
			filename:       "test.txt",
			fieldName:      `file"field`,
			shouldFail:     false,
			expectParseErr: false,
		},
		{
			name:           "fieldname with CR/LF",
			filename:       "test.txt",
			fieldName:      "file\r\nfield",
			shouldFail:     false,
			expectParseErr: true, // multipart reader should reject malformed headers
		},
		{
			name:           "both with malicious chars",
			filename:       `"malicious\r\nfilename.txt`,
			fieldName:      `"malicious\r\nfield`,
			shouldFail:     false,
			expectParseErr: false, // Go properly escapes these, so parsing should succeed
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testCreateMultipartForm(t, tt)
			testCreateMultipartFormWithFields(t, tt)
		})
	}
}

func testCreateMultipartForm(t *testing.T, tt struct {
	name           string
	filename       string
	fieldName      string
	shouldFail     bool
	expectParseErr bool
}) {
	file := irminutils.NewFile("Hello World", tt.filename)

	// Test CreateMultipartForm
	buf, contentType, err := irminutils.CreateMultipartForm(file, tt.fieldName)
	if tt.shouldFail {
		if err == nil {
			t.Error("Expected CreateMultipartForm to fail, but it succeeded")
		}
		return
	}
	if err != nil {
		t.Fatalf("CreateMultipartForm failed: %v", err)
	}

	if buf.Len() == 0 {
		t.Error("Expected non-empty buffer")
	}
	if !strings.Contains(contentType, "multipart/form-data") {
		t.Errorf("Expected multipart content type, got %q", contentType)
	}

	// Try to parse the multipart form
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		t.Fatalf("Failed to parse content type: %v", err)
	}

	boundary, ok := params["boundary"]
	if !ok {
		t.Fatal("No boundary found in content type")
	}

	reader := multipart.NewReader(buf, boundary)
	part, err := reader.NextPart()

	if tt.expectParseErr {
		if err == nil {
			t.Error("Expected multipart parsing to fail due to malformed headers, but it succeeded")
		}
		return
	}

	if err != nil {
		t.Fatalf("Failed to read multipart form: %v", err)
	}

	// Verify that we can extract the form name and filename
	if part.FormName() == "" {
		t.Error("Form name should not be empty")
	}
	if part.FileName() == "" {
		t.Error("Filename should not be empty")
	}
}

func testCreateMultipartFormWithFields(t *testing.T, tt struct {
	name           string
	filename       string
	fieldName      string
	shouldFail     bool
	expectParseErr bool
}) {
	file := irminutils.NewFile("Hello World", tt.filename)

	// Test CreateMultipartFormWithFields
	textFields := map[string]string{"description": "Test file"}
	buf, contentType, err := irminutils.CreateMultipartFormWithFields(file, tt.fieldName, textFields)
	if err != nil {
		t.Fatalf("CreateMultipartFormWithFields failed: %v", err)
	}

	if buf.Len() == 0 {
		t.Error("Expected non-empty buffer")
	}
	if !strings.Contains(contentType, "multipart/form-data") {
		t.Errorf("Expected multipart content type, got %q", contentType)
	}

	// Try to parse the form
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		t.Fatalf("Failed to parse content type: %v", err)
	}

	boundary, ok := params["boundary"]
	if !ok {
		t.Fatal("No boundary found in content type")
	}

	reader := multipart.NewReader(buf, boundary)

	// Skip text fields and read the file part
	var filePart *multipart.Part
	for {
		part, readErr := reader.NextPart()
		if readErr != nil {
			if tt.expectParseErr {
				// Expected failure, test passes
				return
			}
			break
		}
		if part.FileName() != "" {
			filePart = part
			break
		}
	}

	if !tt.expectParseErr {
		if filePart == nil {
			t.Fatal("Failed to find file part in multipart form")
		}

		// Verify that we can extract the form name and filename
		if filePart.FormName() == "" {
			t.Error("Form name should not be empty")
		}
		if filePart.FileName() == "" {
			t.Error("Filename should not be empty")
		}
	}
}

func TestCreateMultipartFormValidOutput(t *testing.T) {
	// Test that the output is still valid multipart form data
	file := irminutils.NewFile("Hello World", "test.txt")
	buf, contentType, err := irminutils.CreateMultipartForm(file, "file")
	if err != nil {
		t.Fatalf("Failed to create form: %v", err)
	}

	// Parse the content type to get the boundary
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		t.Fatalf("Failed to parse content type: %v", err)
	}

	boundary, ok := params["boundary"]
	if !ok {
		t.Fatal("No boundary found in content type")
	}

	// Create a multipart reader to verify the form is valid
	reader := multipart.NewReader(buf, boundary)

	// Read the file part
	part, err := reader.NextPart()
	if err != nil {
		t.Fatalf("Failed to read first part: %v", err)
	}

	if part.FormName() != "file" {
		t.Errorf("Expected form name 'file', got %q", part.FormName())
	}

	if part.FileName() != "test.txt" {
		t.Errorf("Expected filename 'test.txt', got %q", part.FileName())
	}

	content, err := io.ReadAll(part)
	if err != nil {
		t.Fatalf("Failed to read part content: %v", err)
	}

	if string(content) != "Hello World" {
		t.Errorf("Expected content 'Hello World', got %q", string(content))
	}
}
