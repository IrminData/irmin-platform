package mysqlmodels

import (
	"errors"
	mysqlconfig "irmin-connectors/connectors/mysql/config"
	"irmin-connectors/utils"
)

type ConnectionDetails struct {
	Host      string `json:"host"`
	Port      int    `json:"port"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	DefaultDB string `json:"default_db"`
}

// NewConnectionDetailsFromMap creates a ConnectionDetails from a map[string]any.
func NewConnectionDetailsFromMap(details map[string]any) (*ConnectionDetails, error) {
	cd := &ConnectionDetails{
		Host:      utils.GetStringFromMap(details, "host", ""),
		Port:      utils.GetIntFromMap(details, "port", mysqlconfig.DefaultMySQLPort),
		Username:  utils.GetStringFromMap(details, "username", ""),
		Password:  utils.GetStringFromMap(details, "password", ""),
		DefaultDB: utils.GetStringFromMap(details, "default_db", ""),
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
