package irminmodels

import "time"

type APIToken struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Name      string    `json:"name"`
	Token     string    `json:"token,omitempty"`
	ExpiresAt time.Time `json:"expiry"`
}
