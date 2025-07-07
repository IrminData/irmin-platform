package irminmodels

type Workspace struct {
	ID          string `json:"id"              validate:"required,validsqid=workspaces"`
	Name        string `json:"name"            validate:"required,min=1,max=100"`
	Slug        string `json:"slug"            validate:"required,validslug"`
	Description string `json:"description"     validate:"max=500"`
	Owner       User   `json:"owner,omitempty" validate:"required"`
	Users       []User `json:"users,omitempty" validate:"dive"`
}
