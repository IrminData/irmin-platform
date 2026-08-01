package sftpmodels

import (
	"errors"
	sftpconfig "irmin-connectors/connectors/sftp/config"
	"irmin-connectors/utils"
)

type ConnectionDetails struct {
	Host                 string `json:"host"`                   // SFTP server hostname/IP
	Port                 int    `json:"port"`                   // SFTP server port (default 22)
	Username             string `json:"username"`               // Authentication username
	Password             string `json:"password"`               // Authentication password (optional if using key)
	PrivateKey           string `json:"private_key"`            // SSH private key content (optional if using password)
	PrivateKeyPassphrase string `json:"private_key_passphrase"` // Passphrase for encrypted private key
	HostKeyFingerprint   string `json:"host_key_fingerprint"`   // Expected host key fingerprint for verification
}

// NewConnectionDetailsFromMap creates a ConnectionDetails from a map[string]any.
func NewConnectionDetailsFromMap(details map[string]any) (*ConnectionDetails, error) {
	cd := &ConnectionDetails{
		Host:                 utils.GetStringFromMap(details, "host", ""),
		Port:                 utils.GetIntFromMap(details, "port", sftpconfig.DefaultPort),
		Username:             utils.GetStringFromMap(details, "username", ""),
		Password:             utils.GetStringFromMap(details, "password", ""),
		PrivateKey:           utils.GetStringFromMap(details, "private_key", ""),
		PrivateKeyPassphrase: utils.GetStringFromMap(details, "private_key_passphrase", ""),
		HostKeyFingerprint:   utils.GetStringFromMap(details, "host_key_fingerprint", ""),
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
	if cd.HostKeyFingerprint == "" {
		return nil, errors.New("host_key_fingerprint is required")
	}

	// Validate authentication method
	if cd.Password == "" && cd.PrivateKey == "" {
		return nil, errors.New("either password or private_key must be provided for authentication")
	}

	return cd, nil
}
