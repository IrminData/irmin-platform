package irminmodels

import "time"

type Invite struct {
	ID         string     `json:"id"                    validate:"required,validsqid=invites"`
	Email      string     `json:"email"                 validate:"required,email"`
	Role       Role       `json:"role"                  validate:"required"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty"`
	DeclinedAt *time.Time `json:"declined_at,omitempty"`
	ExpiresAt  time.Time  `json:"expires_at"            validate:"required"`
	InvitedBy  User       `json:"invited_by"            validate:"required"`
	Workspace  Workspace  `json:"workspace"             validate:"required"`
}
