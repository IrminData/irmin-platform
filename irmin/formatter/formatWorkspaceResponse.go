package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatWorkspaceResponse(workspace db.Workspace) (*irminmodels.Workspace, error) {
	sqid, _ := utils.EncodeSqids("workspaces", uint64(workspace.ID))
	ownerSqid, _ := utils.EncodeSqids("users", uint64(workspace.Owner.ID))
	var workspaceUsers []irminmodels.User
	for _, userWorkspace := range workspace.Users {
		userResponse, err := FormatWorkspaceUserResponse(userWorkspace)
		if err != nil {
			return nil, fmt.Errorf("error formatting user response: %w", err)
		}
		workspaceUsers = append(workspaceUsers, *userResponse)
	}
	workspaceResponse := irminmodels.Workspace{
		ID:          sqid,
		Name:        workspace.Name,
		Slug:        workspace.Slug,
		Description: workspace.Description,
		Users:       workspaceUsers,
		Owner: irminmodels.User{
			ID:             ownerSqid,
			FirstName:      workspace.Owner.FirstName,
			LastName:       workspace.Owner.LastName,
			Email:          workspace.Owner.Email,
			Phone:          workspace.Owner.Phone,
			Company:        workspace.Owner.Company,
			ProfilePicture: workspace.Owner.ProfilePicture,
		},
	}
	return &workspaceResponse, nil
}
