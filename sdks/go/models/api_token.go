package irminmodels

import "time"

type APIToken struct {
	ID        string    `json:"id"              validate:"required,validsqid=api_tokens" example:"token_1a2b3c"`
	CreatedAt time.Time `json:"created_at"      validate:"required"                      example:"2025-01-15T10:30:00Z"`
	UpdatedAt time.Time `json:"updated_at"      validate:"required"                      example:"2025-12-01T14:22:30Z"`
	Name      string    `json:"name"            validate:"required,max=100"              example:"API Token 1"`
	Token     *string   `json:"token,omitempty" validate:"min=64,validtoken"             example:"1a2b3c4d5e6f7g8h9i0j1k22x3y4z5a6b7c8d9e0"`
	ExpiresAt time.Time `json:"expiry"          validate:"required,gtfield=CreatedAt"    example:"2025-01-15T10:30:00Z"`
}
