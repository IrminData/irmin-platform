package irminModels

type Workspace struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Owner       User   `json:"owner,omitempty"`
	Users       []User `json:"users,omitempty"`
}
