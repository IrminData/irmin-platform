package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
)

func FormatRoleResponse(role *db.Role, sqidManager *irminsqids.SQIDManager) (*irminmodels.Role, error) {
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
