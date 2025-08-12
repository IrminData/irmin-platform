package irminutils

import (
	"bytes"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"
)

const defaultFileMode os.FileMode = 0o644

// File represents file content with a filename.
type File struct {
	Content  []byte
	Filename string
}

// NewFile creates a File from string content and filename.
func NewFile(content, filename string) *File {
	return &File{
		Content:  []byte(content),
		Filename: filename,
	}
}

// NewFileFromBytes creates a File from byte content and filename.
func NewFileFromBytes(content []byte, filename string) *File {
	return &File{
		Content:  content,
		Filename: filename,
	}
}

// Reader returns an io.Reader for the file content.
func (f *File) Reader() io.Reader {
	return bytes.NewReader(f.Content)
}

// MultipartFile returns a multipart.File for the file content.
func (f *File) MultipartFile() multipart.File {
	return &fileWrapper{
		File:   f,
		reader: bytes.NewReader(f.Content),
	}
}

// MimeType returns the MIME type based on the filename extension.
func (f *File) MimeType() string {
	return AutoDetectMimeType(f.Filename)
}

// AutoDetectMimeType detects MIME type from filename extension.
func AutoDetectMimeType(filename string) string {
	ext := filepath.Ext(filename)
	if mimeType := mime.TypeByExtension(ext); mimeType != "" {
		return mimeType
	}
	return "application/octet-stream"
}

// fileWrapper implements multipart.File interface
type fileWrapper struct {
	*File
	reader *bytes.Reader
}

func (w *fileWrapper) Read(p []byte) (int, error) {
	return w.reader.Read(p)
}

func (w *fileWrapper) ReadAt(p []byte, off int64) (int, error) {
	return w.reader.ReadAt(p, off)
}

func (w *fileWrapper) Seek(offset int64, whence int) (int64, error) {
	return w.reader.Seek(offset, whence)
}

func (w *fileWrapper) Close() error {
	return nil
}

func (w *fileWrapper) Stat() (os.FileInfo, error) {
	return &fileInfo{
		name: w.Filename,
		size: int64(len(w.Content)),
	}, nil
}

// fileInfo implements os.FileInfo interface
type fileInfo struct {
	name string
	size int64
}

func (fi *fileInfo) Name() string       { return fi.name }
func (fi *fileInfo) Size() int64        { return fi.size }
func (fi *fileInfo) Mode() os.FileMode  { return defaultFileMode }
func (fi *fileInfo) ModTime() time.Time { return time.Now() }
func (fi *fileInfo) IsDir() bool        { return false }
func (fi *fileInfo) Sys() any           { return nil }

// CreateMultipartForm creates a complete multipart/form-data form.
func CreateMultipartForm(file *File, fieldName string) (*bytes.Buffer, string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Use CreateFormFile which properly escapes fieldName and filename
	fileWriter, err := writer.CreateFormFile(fieldName, file.Filename)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create form file field: %w", err)
	}

	_, err = fileWriter.Write(file.Content)
	if err != nil {
		return nil, "", fmt.Errorf("failed to write content: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return nil, "", fmt.Errorf("failed to close writer: %w", err)
	}

	return &buf, writer.FormDataContentType(), nil
}

// CreateMultipartFormWithFields creates multipart form with additional text fields.
func CreateMultipartFormWithFields(
	file *File,
	fieldName string,
	textFields map[string]string,
) (*bytes.Buffer, string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	for key, value := range textFields {
		err := writer.WriteField(key, value)
		if err != nil {
			return nil, "", fmt.Errorf("failed to write field %q: %w", key, err)
		}
	}

	// Use CreateFormFile which properly escapes fieldName and filename
	fileWriter, err := writer.CreateFormFile(fieldName, file.Filename)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create form file field: %w", err)
	}

	_, err = fileWriter.Write(file.Content)
	if err != nil {
		return nil, "", fmt.Errorf("failed to write content: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return nil, "", fmt.Errorf("failed to close writer: %w", err)
	}

	return &buf, writer.FormDataContentType(), nil
}
