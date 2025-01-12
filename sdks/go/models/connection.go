package models

// Connection represents information on data sources and destinations.
type Connection struct {
	// Connection hash ID
	ID string `json:"id,omitempty"`
	// Connection name
	Name string `json:"name,omitempty"`
	// The workspace user that owns this connection and is responsible for it
	Owner User `json:"owner,omitempty"`
	// Connection description
	Description string `json:"description,omitempty"`
	// Connection documentation as a markdown string
	Documentation string `json:"documentation,omitempty"`
	// String which contains a JSON object
	Details map[string]string `json:"details,omitempty"`
	// String which contains a JSON object
	Settings map[string]string `json:"settings,omitempty"`
	// Connector object
	Connector Connector `json:"connector,omitempty"`
	// Connection creation date
	CreatedAt string `json:"created_at,omitempty"`
	// Connection update date
	UpdatedAt string `json:"updated_at,omitempty"`
}
