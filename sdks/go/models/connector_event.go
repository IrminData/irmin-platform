package irminmodels

// ConnectorEventType represents the type of webhook event sent by a connector.
type ConnectorEventType string

const (
	ConnectorEventTypeCreate ConnectorEventType = "create"
	ConnectorEventTypeUpdate ConnectorEventType = "update"
	ConnectorEventTypeDelete ConnectorEventType = "delete"
)

// ConnectorEvent represents a webhook event sent by a connector when a change in the data occurs.
type ConnectorEvent struct {
	// Type of the event
	Type ConnectorEventType `json:"type"      validate:"required,oneof=create update delete" example:"create"`
	// Irmin path of the event (e.g. /maindb/users.json/1/name)
	Path string `json:"path"      validate:"required"                            example:"/maindb/users.json/1/name"`
	// Timestamp of the event in milliseconds since the Unix epoch
	Timestamp int64 `json:"timestamp" validate:"required,min=0"                      example:"1717334400000"`
}
