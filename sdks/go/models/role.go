package irminmodels

type Role struct {
	ID          string `json:"id"          validate:"required,validsqid=roles"`
	Role        string `json:"role"        validate:"required,max=50"`
	Description string `json:"description" validate:"max=200"`
	IsOwner     bool   `json:"is_owner"`
	IsDefault   bool   `json:"is_default"`
}
