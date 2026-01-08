package pineconemodels

import (
	"errors"
	"irmin-connectors/utils"
)

// ConnectionSettings holds the configuration for a Pinecone connection.
type ConnectionSettings struct {
	Host      string `json:"host"`
	Namespace string `json:"namespace"`
}

// NewConnectionSettingsFromMap creates a ConnectionSettings from a map[string]any.
func NewConnectionSettingsFromMap(settings map[string]any) (*ConnectionSettings, error) {
	cs := &ConnectionSettings{
		Host:      utils.GetStringFromMap(settings, "host", ""),
		Namespace: utils.GetStringFromMap(settings, "namespace", ""),
	}

	// Validate required fields
	if cs.Host == "" {
		return nil, errors.New("host is required")
	}

	return cs, nil
}
