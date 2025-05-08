package irminmodels

// ConnectorEvent represents a webhook event sent by a connector when a change in the data occurs.
type ConnectorEvent struct {
	// Type of the event (e.g. "create", "update", "delete")
	Type string `json:"type"`
	// Irmin path of the event (e.g. /maindb/users.json/1/name)
	Path string `json:"path"`
	// Timestamp of the event in milliseconds since the Unix epoch
	Timestamp int64 `json:"timestamp"`
}
