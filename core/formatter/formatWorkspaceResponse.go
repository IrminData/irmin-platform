package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
)

func FormatWorkspaceResponse(
	workspace *db.Workspace,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.Workspace, error) {
	sqid, _ := sqidManager.Encode("workspaces", uint64(workspace.ID))
	ownerSqid, _ := sqidManager.Encode("users", uint64(workspace.Owner.ID))
	var workspaceUsers []irminmodels.User
	for _, userWorkspace := range workspace.Users {
		userResponse, err := FormatWorkspaceUserResponse(&userWorkspace, sqidManager)
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
