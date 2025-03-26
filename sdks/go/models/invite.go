package irminModels

import "time"

type InviteResponse struct {
	ID         string     `json:"id"`
	Email      string     `json:"email"`
	Role       IrminRole  `json:"role"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty"`
	DeclinedAt *time.Time `json:"declined_at,omitempty"`
	ExpiresAt  time.Time  `json:"expires_at"`
	InvitedBy  User       `json:"invited_by"`
	Workspace  Workspace  `json:"workspace"`
}
