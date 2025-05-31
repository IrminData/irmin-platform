package irminmodels

type Role struct {
	ID          string `json:"id"`
	Role        string `json:"role"`
	Description string `json:"description"`
	Default     bool   `json:"default"`
}
