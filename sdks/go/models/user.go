package irminmodels

type User struct {
	ID             string `json:"id"              validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
	FirstName      string `json:"first_name"      validate:"required,max=50"          example:"John"`
	LastName       string `json:"last_name"       validate:"required,max=50"          example:"Doe"`
	Email          string `json:"email"           validate:"required,email"           example:"john.doe@example.com"`
	Phone          string `json:"phone"           validate:"validphone"               example:"+1-555-0123"`
	Company        string `json:"company"         validate:"max=100"                  example:"Acme Corp"`
	ProfilePicture string `json:"profile_picture" validate:"validimageurl"            example:"https://avatars.example.com/john-doe.jpg"`
	Roles          []Role `json:"roles"           validate:"dive"`
}
