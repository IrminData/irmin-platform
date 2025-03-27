package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatUserResponse creates a user response object from a workspace user object.
func FormatUserResponse(workspaceUser db.WorkspaceUser) (*irminModels.User, error) {
	// Construct the user sqid
	userSqid, err := utils.EncodeSqids("users", uint64(workspaceUser.UserID))
	if err != nil {
		return nil, fmt.Errorf("error encoding user sqid: %w", err)
	}
	// Construct the roles
	var roles []irminModels.IrminRole
	for _, role := range workspaceUser.Roles {
		roleResponse, err := FormatRoleResponse(role)
		if err != nil {
			return nil, fmt.Errorf("error formatting role response: %w", err)
		}
		roles = append(roles, *roleResponse)
	}
	// Construct the user object
	userResponse := irminModels.User{
		ID:             userSqid,
		FirstName:      workspaceUser.User.FirstName,
		LastName:       workspaceUser.User.LastName,
		Email:          workspaceUser.User.Email,
		Phone:          workspaceUser.User.Phone,
		Company:        workspaceUser.User.Company,
		ProfilePicture: workspaceUser.User.ProfilePicture,
		Roles:          roles,
	}
	return &userResponse, nil
}
