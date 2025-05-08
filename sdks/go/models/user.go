package irminmodels

type User struct {
	ID             string      `json:"id"`
	FirstName      string      `json:"first_name"`
	LastName       string      `json:"last_name"`
	Email          string      `json:"email"`
	Phone          string      `json:"phone"`
	Company        string      `json:"company"`
	ProfilePicture string      `json:"profile_picture"`
	Roles          []IrminRole `json:"roles,omitempty"`
}
