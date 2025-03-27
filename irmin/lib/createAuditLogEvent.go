package lib

import (
	"irmin-api/db"
	"irmin-api/utils"
	"log"
)

// CreateAuditLogEventAsync creates an audit log event asynchronously.
func CreateAuditLogEventAsync(event *db.LogEvent) {
	// Launch asynchronous execution using utils.Async.
	// The FutureResult is intentionally not awaited.
	_ = utils.Async(func() (struct{}, error) {
		// Attempt to create the log event.
		if _, err := db.CreateLogEvent(event); err != nil {
			// Log the error if creation fails.
			log.Printf("failed to create audit log event: %v", err)
		}
		return struct{}{}, nil
	})
}
