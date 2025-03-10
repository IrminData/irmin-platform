package utils

import (
	"encoding/json"
	"net/http"
)

// WriteJSONResponse sets the Content-Type header and writes the payload as JSON with the provided status code.
func WriteJSONResponse(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
