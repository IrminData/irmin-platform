package sftpclient

import (
	"context"
	"encoding/json"
	sftpmodels "irmin-connectors/connectors/sftp/models"
	"irmin-connectors/db"
	"log/slog"
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
	var detailsMap map[string]any
	if err := json.Unmarshal(operation.Details, &detailsMap); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal details",
			"error", err)
		return nil, err
	}

	var settingsMap map[string]any
	if err := json.Unmarshal(operation.Settings, &settingsMap); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal settings",
			"error", err)
		return nil, err
	}

	// Parse connection details using model
	connectionDetails, err := sftpmodels.NewConnectionDetailsFromMap(detailsMap)
	if err != nil {
		logger.ErrorContext(ctx, "failed to parse connection details",
			"error", err)
		return nil, err
	}

	// Parse connection settings using model (optional for SFTP)
	connectionSettings, settingsErr := sftpmodels.NewConnectionSettingsFromMap(settingsMap)
	if settingsErr != nil {
		logger.InfoContext(ctx, "using default connection settings",
			"reason", settingsErr.Error())
		// Use default settings if parsing fails
		connectionSettings = &sftpmodels.ConnectionSettings{
			RemotePath:         "/",
			FilePatterns:       []string{"*"},
			PreserveTimestamps: false,
			OverwriteExisting:  false,
			CreateDirectories:  true,
			TransferMode:       "binary",
		}
	}

	// Create connection configuration
	config := &ConnectionConfig{
		Host:                 connectionDetails.Host,
		Port:                 connectionDetails.Port,
		Username:             connectionDetails.Username,
		Password:             connectionDetails.Password,
		PrivateKey:           connectionDetails.PrivateKey,
		PrivateKeyPassphrase: connectionDetails.PrivateKeyPassphrase,
		HostKeyFingerprint:   connectionDetails.HostKeyFingerprint,
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
		"host", connectionDetails.Host,
		"port", connectionDetails.Port,
		"username", connectionDetails.Username,
		"auth_method", getAuthMethod(connectionDetails.Password, connectionDetails.PrivateKey),
		"remote_path", connectionSettings.RemotePath,
		"transfer_mode", connectionSettings.TransferMode)

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
