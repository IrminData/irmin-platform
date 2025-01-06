package models

// SystemToken represents an Irmin system token.
type SystemToken struct {
	// Unique identifier of the token
	ID string `json:"id"`
	// Device identifier provided during creation
	Name string `json:"name"`
	// Timestamp of when the token expires
	Expiry string `json:"expiry"`
	// (optional) The token. Only provided on creation
	Token *string `json:"token,omitempty"`
}
