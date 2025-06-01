package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatInviteResponse(invite *db.Invite, sqidManager *utils.SQIDManager) (*irminmodels.Invite, error) {
	// Get the sqid of the invite
	inviteSqid, err := sqidManager.Encode("invites", uint64(invite.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding invite sqid: %w", err)
	}

	// Get the sqid of the user who invited the invitee
	invitedBySqid, err := sqidManager.Encode("users", uint64(invite.InvitedByID))
	if err != nil {
		return nil, fmt.Errorf("error encoding invited by sqid: %w", err)
	}

	// Get the sqid of the workspace the invite is for
	workspaceSqid, err := sqidManager.Encode("workspaces", uint64(invite.WorkspaceID))
	if err != nil {
		return nil, fmt.Errorf("error encoding workspace sqid: %w", err)
	}

	// Get the sqid of the role the invite is for
	roleSqid, err := sqidManager.Encode("roles", uint64(invite.RoleID))
	if err != nil {
		return nil, fmt.Errorf("error encoding role sqid: %w", err)
	}

	// Format the invite response
	var acceptedAt *time.Time
	if invite.AcceptedAt != nil {
		acceptedAt = invite.AcceptedAt
	}
	var declinedAt *time.Time
	if invite.DeclinedAt != nil {
		declinedAt = invite.DeclinedAt
	}
	inviteResponse := irminmodels.Invite{
		ID:         inviteSqid,
		Email:      invite.Email,
		RoleID:     roleSqid,
		AcceptedAt: acceptedAt,
		DeclinedAt: declinedAt,
		ExpiresAt:  invite.ExpiresAt,
		InvitedBy: irminmodels.User{
			ID:             invitedBySqid,
			FirstName:      invite.InvitedBy.FirstName,
			LastName:       invite.InvitedBy.LastName,
			Email:          invite.InvitedBy.Email,
			Phone:          invite.InvitedBy.Phone,
			Company:        invite.InvitedBy.Company,
			ProfilePicture: invite.InvitedBy.ProfilePicture,
		},
		Workspace: irminmodels.Workspace{
			ID:          workspaceSqid,
			Name:        invite.Workspace.Name,
			Slug:        invite.Workspace.Slug,
			Description: invite.Workspace.Description,
		},
	}

	return &inviteResponse, nil
}
