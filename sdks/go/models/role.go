package irminmodels

type Role struct {
	ID          string `json:"id"          validate:"required,validsqid=roles" example:"role_2a8m5x9n4p7s"`
	Role        string `json:"role"        validate:"required,max=50"          example:"Administrator"`
	Description string `json:"description" validate:"max=200"                  example:"Full system access with administrative privileges"`
	IsOwner     bool   `json:"is_owner"                                        example:"false"`
	IsDefault   bool   `json:"is_default"                                      example:"false"`
}
