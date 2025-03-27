package formatter

import (
	"fmt"
	"irmin-api/db"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatRoleResponse(role db.UserWorkspaceRole) (*irminModels.IrminRole, error) {
	var roleResponse irminModels.IrminRole
	switch role {
	case "admin":
		roleResponse = irminModels.IrminRole{
			Description: "Can perform all actions on the workspace",
			Label:       "Admin",
			Name:        "admin",
		}
	case "editor":
		roleResponse = irminModels.IrminRole{
			Description: "Can perform all actions except managing access",
			Label:       "Editor",
			Name:        "editor",
		}
	case "viewer":
		roleResponse = irminModels.IrminRole{
			Description: "Can view all data but cannot make changes",
			Label:       "Viewer",
			Name:        "viewer",
		}
	default:
		return nil, fmt.Errorf("invalid role: %s", role)
	}

	return &roleResponse, nil
}
