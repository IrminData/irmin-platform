package irminmodels

type Role struct {
	ID          string `json:"id"`
	Role        string `json:"role"`
	Description string `json:"description"`
	IsOwner     bool   `json:"is_owner"`
	IsDefault   bool   `json:"is_default"`
}
