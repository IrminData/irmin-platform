package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatRoleResponse(role *db.Role, sqidManager *utils.SQIDManager) (*irminmodels.Role, error) {
	// Get the sqid of the role
	roleSqid, err := sqidManager.Encode("roles", uint64(role.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding role sqid: %w", err)
	}

	roleResponse := irminmodels.Role{
		ID:          roleSqid,
		Role:        role.Role,
		Description: role.Description,
		IsOwner:     role.IsOwner,
		IsDefault:   role.IsDefault,
	}

	return &roleResponse, nil
}
