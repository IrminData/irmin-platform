package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatWorkspaceUserResponse creates a user response object from a workspace user object.
func FormatWorkspaceUserResponse(workspaceUser *db.WorkspaceUser) (*irminmodels.User, error) {
	// Construct the user sqid
	userSqid, err := utils.EncodeSqids("users", uint64(workspaceUser.UserID))
	if err != nil {
		return nil, fmt.Errorf("error encoding user sqid: %w", err)
	}
	// Construct the roles
	var roles []irminmodels.IrminRole
	for _, role := range workspaceUser.Roles {
		roles = append(roles, irminmodels.IrminRole(role))
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
func FormatUserResponse(user *db.User) (*irminmodels.User, error) {
	// Construct the user sqid
	userSqid, err := utils.EncodeSqids("users", uint64(user.ID))
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
