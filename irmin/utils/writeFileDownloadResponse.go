package utils

import (
	"fmt"
	"net/http"
)

// WriteFileDownloadResponse writes a file download response with the given status and filename.
func WriteFileDownloadResponse(w http.ResponseWriter, status int, filename string, data []byte) {
	// Write response
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.WriteHeader(status)
	_, _ = w.Write(data)
}
