package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
)

// FormatUserResponse creates a user response object from a workspace user object.
func FormatUserResponse(workspaceUser db.WorkspaceUser) (*db.UserResponse, error) {
	// Construct the user sqid
	userSqid, err := utils.EncodeSqids("users", uint64(workspaceUser.UserID))
	if err != nil {
		return nil, fmt.Errorf("error encoding user sqid: %w", err)
	}
	// Construct the user object
	userResponse := db.UserResponse{
		ID:             userSqid,
		FirstName:      workspaceUser.User.FirstName,
		LastName:       workspaceUser.User.LastName,
		Email:          workspaceUser.User.Email,
		Phone:          workspaceUser.User.Phone,
		Company:        workspaceUser.User.Company,
		ProfilePicture: workspaceUser.User.ProfilePicture,
		Roles:          workspaceUser.Roles,
	}
	return &userResponse, nil
}
