package irminmodels

import "time"

type Invite struct {
	ID         string     `json:"id"                    validate:"required,validsqid=invites" example:"inv_1a2b3c4d"`
	Email      string     `json:"email"                 validate:"required,email"             example:"john.doe@example.com"`
	Role       Role       `json:"role"                  validate:"required"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty"                                       example:"2025-01-15T10:30:00Z"`
	DeclinedAt *time.Time `json:"declined_at,omitempty"                                       example:"2025-01-15T10:30:00Z"`
	ExpiresAt  time.Time  `json:"expires_at"            validate:"required"                   example:"2025-01-15T10:30:00Z"`
	InvitedBy  User       `json:"invited_by"            validate:"required"`
	Workspace  Workspace  `json:"workspace"             validate:"required"`
}
