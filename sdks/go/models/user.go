package irminmodels

type User struct {
	ID             string `json:"id"              validate:"required,validsqid=users"`
	FirstName      string `json:"first_name"      validate:"required,max=50"`
	LastName       string `json:"last_name"       validate:"required,max=50"`
	Email          string `json:"email"           validate:"required,email"`
	Phone          string `json:"phone"           validate:"validphone"`
	Company        string `json:"company"         validate:"max=100"`
	ProfilePicture string `json:"profile_picture" validate:"validimageurl"`
	Roles          []Role `json:"roles"           validate:"dive"`
}
