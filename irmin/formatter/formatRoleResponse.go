package formatter

import (
	"fmt"
	"irmin-api/db"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatRoleResponse(role db.UserWorkspaceRole) (*irminModels.Role, error) {
	var roleResponse irminModels.Role
	switch role {
	case "admin":
		roleResponse = irminModels.Role{
			Description: "Can perform all actions on the workspace",
			Label:       "Admin",
			Name:        "admin",
		}
	case "editor":
		roleResponse = irminModels.Role{
			Description: "Can perform all actions except managing access",
			Label:       "Editor",
			Name:        "editor",
		}
	case "viewer":
		roleResponse = irminModels.Role{
			Description: "Can view all data but cannot make changes",
			Label:       "Viewer",
			Name:        "viewer",
		}
	default:
		return nil, fmt.Errorf("invalid role: %s", role)
	}

	return &roleResponse, nil
}
