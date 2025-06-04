package irminmodels

import "time"

type Invite struct {
	ID         string     `json:"id"`
	Email      string     `json:"email"`
	Role       Role       `json:"role"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty"`
	DeclinedAt *time.Time `json:"declined_at,omitempty"`
	ExpiresAt  time.Time  `json:"expires_at"`
	InvitedBy  User       `json:"invited_by"`
	Workspace  Workspace  `json:"workspace"`
}
