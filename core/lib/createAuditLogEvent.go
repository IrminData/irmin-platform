package lib

import (
	"irmin-api/db"
	"log/slog"
)

// CreateAuditLogEventAsync creates an audit log event asynchronously.
func CreateAuditLogEventAsync(d *db.Database, logger *slog.Logger, event *db.LogEvent) {
	go func() {
		// Attempt to create the log event.
		if err := d.DB.Create(&event).Error; err != nil {
			logger.Error("failed to create audit log event", "error", err)
		}
	}()
}
