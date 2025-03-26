package irminModels

type IrminRole struct {
	Description string `json:"description"`
	Label       string `json:"label"`
	Name        string `json:"name"` // e.g. "admin", "editor", "viewer"
}
