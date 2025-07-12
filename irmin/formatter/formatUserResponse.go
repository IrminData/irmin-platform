package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatWorkspaceUserResponse creates a user response object from a workspace user object.
func FormatWorkspaceUserResponse(
	workspaceUser *db.WorkspaceUser,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.User, error) {
	// Construct the user sqid
	userSqid, err := sqidManager.Encode("users", uint64(workspaceUser.UserID))
	if err != nil {
		return nil, fmt.Errorf("error encoding user sqid: %w", err)
	}
	// Construct the roles
	var roles []irminmodels.Role
	for _, role := range workspaceUser.Roles {
		formattedRole, formatRoleErr := FormatRoleResponse(&role.Role, sqidManager)
		if formatRoleErr != nil {
			return nil, fmt.Errorf("error formatting role: %w", formatRoleErr)
		}
		roles = append(roles, *formattedRole)
	}
	// Construct the user object
	userResponse := irminmodels.User{
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

// FormatUserResponse creates a role response object from a workspace role object.
func FormatUserResponse(user *db.User, sqidManager *irminsqids.SQIDManager) (*irminmodels.User, error) {
	// Construct the user sqid
	userSqid, err := sqidManager.Encode("users", uint64(user.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding user sqid: %w", err)
	}
	// Construct the user object
	userResponse := irminmodels.User{
		ID:             userSqid,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		Email:          user.Email,
		Phone:          user.Phone,
		Company:        user.Company,
		ProfilePicture: user.ProfilePicture,
	}
	return &userResponse, nil
}
