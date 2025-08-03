package irminmodels

type Workspace struct {
	ID          string `json:"id"              validate:"required,validsqid=workspaces" example:"ws_5n8k2m7x9q4p"`
	Name        string `json:"name"            validate:"required,max=100"              example:"Data Analytics Team"`
	Slug        string `json:"slug"            validate:"required,validslug"            example:"data-analytics-team"`
	Description string `json:"description"     validate:"max=500"                       example:"Workspace for data analytics and business intelligence projects"`
	Owner       User   `json:"owner,omitempty" validate:"required"`
	Users       []User `json:"users,omitempty" validate:"dive"`
}
