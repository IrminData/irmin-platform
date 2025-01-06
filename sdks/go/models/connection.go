package models

// Connection represents information on data sources and destinations.
type Connection struct {
	// Connection hash ID
	ID string `json:"id"`
	// Connection name
	Name string `json:"name"`
	// The workspace user that owns this connection and is responsible for it
	Owner User `json:"owner"`
	// Connection description
	Description string `json:"description"`
	// Connection documentation as a markdown string
	Documentation string `json:"documentation"`
	// String which contains a JSON object
	Details string `json:"details"`
	// String which contains a JSON object
	Settings string `json:"settings"`
	// Connector object
	Connector Connector `json:"connector"`
	// Connection creation date
	CreatedAt string `json:"created_at"`
	// Connection update date
	UpdatedAt string `json:"updated_at"`
}
