package models

type Workspace struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	OwnerID     string `json:"owner_id"`
	Description string `json:"description"`
	Users       []User `json:"users"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}
