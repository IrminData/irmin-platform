package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatRoleResponse(role db.UserWorkspaceRole) (*irminmodels.Role, error) {
	var roleResponse irminmodels.Role
	switch role {
	case "admin":
		roleResponse = irminmodels.Role{
			Description: "Can perform all actions on the workspace",
			Label:       "Admin",
			Name:        "admin",
		}
	case "editor":
		roleResponse = irminmodels.Role{
			Description: "Can perform all actions except managing access",
			Label:       "Editor",
			Name:        "editor",
		}
	case "viewer":
		roleResponse = irminmodels.Role{
			Description: "Can view all data but cannot make changes",
			Label:       "Viewer",
			Name:        "viewer",
		}
	default:
		return nil, fmt.Errorf("invalid role: %s", role)
	}

	return &roleResponse, nil
}
