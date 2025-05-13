package irminutils

import (
	"archive/zip"
	"bytes"
	"io"
	"path"
)

// ZipFiles compresses the given map of files into a ZIP archive.
//
// files map keys are the full paths within the archive (e.g. "path/to/file.json"),
// and values are the corresponding file contents.
//
// It returns a byte slice containing the complete ZIP archive,
// or an error if any step fails.
func ZipFiles(files map[string][]byte) ([]byte, error) {
	// buffer to hold ZIP data in memory
	var buf bytes.Buffer

	// create a new ZIP writer writing into buf
	zw := zip.NewWriter(&buf)

	// iterate over all files to add to the archive
	for filePath, content := range files {
		// create a new entry for this file path
		entryWriter, err := zw.Create(filePath)
		if err != nil {
			// ensure writer is closed on error
			zw.Close()
			return nil, err
		}

		// write the file content into the ZIP entry
		if _, err := entryWriter.Write(content); err != nil {
			zw.Close()
			return nil, err
		}
	}

	// finalise the ZIP file (flush all data)
	if err := zw.Close(); err != nil {
		return nil, err
	}

	// return the in-memory ZIP archive
	return buf.Bytes(), nil
}

// UnzipFiles decompresses a ZIP archive from a byte slice into a map of file paths to contents.
//
// The input is a byte slice containing a ZIP archive.
// Returns a map where keys are the full paths within the archive (e.g. "path/to/file.json")
// and values are the file contents, or an error if the decompression fails.
//
// Example paths in the returned map:
//   - "config/settings.json"
//   - "src/main.go"
//   - "docs/README.md"
func UnzipFiles(zipData []byte) (map[string][]byte, error) {
	// create a bytes reader for the ZIP data
	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return nil, err
	}

	// initialize the result map
	files := make(map[string][]byte)

	// iterate through all files in the archive
	for _, file := range zipReader.File {
		// skip directories
		if file.FileInfo().IsDir() {
			continue
		}

		// get the full path, ensuring it's clean and normalized
		filePath := path.Clean(file.Name)

		// open the file in the archive
		rc, err := file.Open()
		if err != nil {
			return nil, err
		}

		// read the file contents
		content, err := io.ReadAll(rc)
		rc.Close() // ensure the file is closed
		if err != nil {
			return nil, err
		}

		// store the file contents in the map with the full path
		files[filePath] = content
	}

	return files, nil
}
