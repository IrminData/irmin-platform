package models

type User struct {
	ID             string       `json:"id"`
	ClerkID        string       `json:"clerk_id"`
	FirstName      string       `json:"first_name"`
	LastName       string       `json:"last_name"`
	Email          string       `json:"email"`
	Phone          string       `json:"phone"`
	Company        *string      `json:"company"`
	ProfilePicture *string      `json:"profile_picture"`
	Workspace      *Workspace   `json:"workspace"`
	Roles          []*IrminRole `json:"roles"`
}
