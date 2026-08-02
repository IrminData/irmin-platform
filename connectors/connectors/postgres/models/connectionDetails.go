package postgresmodels

import (
	"errors"
	postgresconfig "irmin-connectors/connectors/postgres/config"
	"irmin-connectors/utils"
)

type ConnectionDetails struct {
	Host           string `json:"host"`
	Port           int    `json:"port"`
	Username       string `json:"username"`
	Password       string `json:"password"`
	SSLMode        bool   `json:"ssl_mode"`
	DefaultDB      string `json:"default_db"`
	ChannelBinding string `json:"channel_binding"` // "", "disable", "prefer", "require"
}

// NewConnectionDetailsFromMap creates a ConnectionDetails from a map[string]any.
func NewConnectionDetailsFromMap(details map[string]any) (*ConnectionDetails, error) {
	sslModeStr := utils.GetStringFromMap(details, "ssl_mode", "false")

	// Validate and sanitize channel_binding to prevent DSN injection
	channelBinding := utils.GetStringFromMap(details, "channel_binding", "")
	switch channelBinding {
	case "", "disable", "prefer", "require":
		// Valid values
	default:
		channelBinding = "" // Invalid value, reset to default
	}

	cd := &ConnectionDetails{
		Host:           utils.GetStringFromMap(details, "host", ""),
		Port:           utils.GetIntFromMap(details, "port", postgresconfig.DefaultPostgreSQLPort),
		Username:       utils.GetStringFromMap(details, "username", ""),
		Password:       utils.GetStringFromMap(details, "password", ""),
		SSLMode:        sslModeStr == "true",
		DefaultDB:      utils.GetStringFromMap(details, "default_db", ""),
		ChannelBinding: channelBinding,
	}

	// Validate required fields
	if cd.Host == "" {
		return nil, errors.New("host is required")
	}
	if cd.Username == "" {
		return nil, errors.New("username is required")
	}
	if cd.Port <= 0 {
		return nil, errors.New("port must be greater than 0")
	}

	return cd, nil
}
