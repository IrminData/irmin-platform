package postgresmodels

import (
	"errors"
	"irmin-connectors/utils"
)

type ConnectionSettings struct {
	Database string `json:"database"`
}

// NewConnectionSettingsFromMap creates a ConnectionSettings from a map[string]any.
func NewConnectionSettingsFromMap(settings map[string]any) (*ConnectionSettings, error) {
	cs := &ConnectionSettings{
		Database: utils.GetStringFromMap(settings, "database", ""),
	}

	// Validate required fields
	if cs.Database == "" {
		return nil, errors.New("database is required")
	}

	return cs, nil
}
