package lib

import (
	"irmin-api/db"
	"log"
)

// CreateAuditLogEventAsync creates an audit log event asynchronously.
func CreateAuditLogEventAsync(event *db.LogEvent) {
	go func() {
		// Attempt to create the log event.
		if _, err := db.CreateLogEvent(event); err != nil {
			// Log the error if creation fails.
			log.Printf("failed to create audit log event: %v", err)
		}
	}()
}
