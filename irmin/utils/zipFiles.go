package utils

import (
	"archive/zip"
	"bytes"
)

// ZipFiles compresses the given map of files into a ZIP archive.
//
// files map keys are the paths within the archive, and values are
// the corresponding file contents.
//
// It returns a byte slice containing the complete ZIP archive,
// or an error if any step fails.
func ZipFiles(files map[string][]byte) ([]byte, error) {
	// buffer to hold ZIP data in memory
	var buf bytes.Buffer

	// create a new ZIP writer writing into buf
	zw := zip.NewWriter(&buf)

	// iterate over all files to add to the archive
	for path, content := range files {
		// create a new entry for this file path
		entryWriter, err := zw.Create(path)
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
