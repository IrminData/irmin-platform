package pineconemodels

import (
	"errors"
	"irmin-connectors/utils"
)

// ConnectionDetails holds the sensitive authentication information for Pinecone.
type ConnectionDetails struct {
	APIKey string `json:"api_key"`
}

// NewConnectionDetailsFromMap creates a ConnectionDetails from a map[string]any.
func NewConnectionDetailsFromMap(details map[string]any) (*ConnectionDetails, error) {
	cd := &ConnectionDetails{
		APIKey: utils.GetStringFromMap(details, "api_key", ""),
	}

	// Validate required fields
	if cd.APIKey == "" {
		return nil, errors.New("api_key is required")
	}

	return cd, nil
}
