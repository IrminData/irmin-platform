package common

import (
	"encoding/json"
	"irmin-connectors/db"
	"log/slog"

	"gorm.io/datatypes"
)

// LogOperationEvent creates an operation log entry with the specified type, message, and metadata.
// This is a helper function to standardize operation logging across all connector handlers.
//
// logger is nil-safe — callers that haven't wired one in (notably the
// Phase-4 inline EnsureOperationFromRequest path, which has no
// per-call logger to thread) fall through to slog.Default() so a
// metadata-marshal or DB-write failure still surfaces somewhere.
func LogOperationEvent(
	dbInstance *db.Database,
	logger *slog.Logger,
	operationID uint,
	eventType db.LogEventType,
	message string,
	metadata map[string]any,
) {
	if logger == nil {
		logger = slog.Default()
	}
	// Marshal metadata to JSON
	var metadataJSON datatypes.JSON
	if metadata != nil {
		metadataBytes, err := json.Marshal(metadata)
		if err != nil {
			logger.Error("failed to marshal operation log metadata", "error", err, "operation_id", operationID)
			return
		}
		metadataJSON = datatypes.JSON(metadataBytes)
	}

	// Create the operation log
	operationLog := &db.OperationLog{
		Type:        eventType,
		Message:     message,
		Metadata:    metadataJSON,
		OperationID: operationID,
	}

	// Persist to database
	if _, err := dbInstance.CreateOperationLog(operationLog); err != nil {
		logger.Error("failed to create operation log", "error", err, "operation_id", operationID)
	}
}
