package irminmodels

type IrminRole string

const (
	Admin  IrminRole = "admin"
	Editor IrminRole = "editor"
	Viewer IrminRole = "viewer"
)

type Role struct {
	Description string    `json:"description"`
	Label       string    `json:"label"`
	Name        IrminRole `json:"name"`
}
