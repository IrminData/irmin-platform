package sftpclient

import (
	"context"
	"encoding/json"
	"errors"
	"irmin-connectors/db"
	"log/slog"
	"strconv"
	"time"
)

const (
	// DefaultTimeoutSeconds is the default connection timeout in seconds.
	DefaultTimeoutSeconds = 30
)

// InitSftpClient initializes an SftpClient instance based on the data provided in the operation.
func InitSftpClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (*SftpClient, error) {
	// Extract operation connection details and settings
	var details map[string]string
	if err := json.Unmarshal(operation.Details, &details); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal details",
			"error", err)
		return nil, err
	}

	var settings map[string]string
	if err := json.Unmarshal(operation.Settings, &settings); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal settings",
			"error", err)
		return nil, err
	}

	// Extract connection details
	host := details["host"]
	portStr := details["port"]
	username := details["username"]
	password := details["password"]
	privateKey := details["private_key"]
	privateKeyPassphrase := details["private_key_passphrase"]
	hostKeyFingerprint := details["host_key_fingerprint"]

	// Parse port (default to 22 if not specified)
	port := 22
	if portStr != "" {
		var err error
		port, err = strconv.Atoi(portStr)
		if err != nil {
			logger.ErrorContext(ctx, "failed to parse port",
				"error", err, "port", portStr)
			return nil, err
		}
	}

	// Check for missing required fields
	if host == "" || username == "" {
		err := errors.New("missing required connection details: host and username are required")
		logger.ErrorContext(ctx, "missing required connection details",
			"error", err)
		return nil, err
	}

	// Validate authentication method
	if password == "" && privateKey == "" {
		err := errors.New("either password or private_key must be provided for authentication")
		logger.ErrorContext(ctx, "no authentication method provided",
			"error", err)
		return nil, err
	}

	// Create connection configuration
	config := &ConnectionConfig{
		Host:                 host,
		Port:                 port,
		Username:             username,
		Password:             password,
		PrivateKey:           privateKey,
		PrivateKeyPassphrase: privateKeyPassphrase,
		HostKeyFingerprint:   hostKeyFingerprint,
		Timeout:              DefaultTimeoutSeconds * time.Second, // Default timeout
	}

	// Create SFTP client instance
	client, err := NewSftpClient(config)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create SFTP client",
			"error", err)
		return nil, err
	}

	logger.InfoContext(ctx, "SFTP client initialized successfully",
		"host", host,
		"port", port,
		"username", username,
		"auth_method", getAuthMethod(password, privateKey))

	return client, nil
}

// getAuthMethod returns a string describing the authentication method being used.
func getAuthMethod(password, privateKey string) string {
	switch {
	case password != "" && privateKey != "":
		return "password_and_key"
	case privateKey != "":
		return "private_key"
	case password != "":
		return "password"
	default:
		return "none"
	}
}
