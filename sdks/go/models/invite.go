package models

// Invite represents an invitation object.
type Invite struct {
	// Invite ID
	ID string `json:"id"`
	// First name of the invitee
	FirstName string `json:"first_name"`
	// Last name of the invitee
	LastName string `json:"last_name"`
	// Email of the invitee
	Email string `json:"email"`
	// Phone number of the invitee
	Phone string `json:"phone"`
	// Company of the invitee (optional)
	Company *string `json:"company,omitempty"`
	// Invitee's role object
	Role IrminRole `json:"role"`
	// Invite created date
	InvitedAt string `json:"invited_at"`
	// Invite expired date (nullable)
	ExpiredAt *string `json:"expired_at,omitempty"`
	// Invite deleted date (nullable)
	DeletedAt *string `json:"deleted_at,omitempty"`
}

// InviteSignedURLPayload represents the payload for a signed URL associated with an invite.
type InviteSignedURLPayload struct {
	// Invite hash ID
	Invite string `json:"invite"`
	// First name of the invitee
	FirstName string `json:"first_name"`
	// Last name of the invitee
	LastName string `json:"last_name"`
	// Email of the invitee
	Email string `json:"email"`
	// Phone number of the invitee
	Phone string `json:"phone"`
	// Company name of the invitee (optional)
	Company *string `json:"company,omitempty"`
	// Name of the workspace the invite is for
	Workspace string `json:"workspace"`
	// Inviter's full name
	Inviter string `json:"inviter"`
	// Whether the invitee has an account
	HasAnAccount bool `json:"has_an_account"`
}
