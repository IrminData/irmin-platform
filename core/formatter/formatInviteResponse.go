package formatter

import (
	"fmt"
	"irmin-api/db"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
)

func FormatInviteResponse(invite *db.Invite, sqidManager *irminsqids.SQIDManager) (*irminmodels.Invite, error) {
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

	// Get the sqid of the workspace owner
	ownerSqid, err := sqidManager.Encode("users", uint64(invite.Workspace.OwnerID))
	if err != nil {
		return nil, fmt.Errorf("error encoding workspace owner sqid: %w", err)
	}

	// Format the role
	formattedRole, formatRoleErr := FormatRoleResponse(&invite.Role, sqidManager)
	if formatRoleErr != nil {
		return nil, fmt.Errorf("error formatting role: %w", formatRoleErr)
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
		Role:       *formattedRole,
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
			Owner: irminmodels.User{
				ID:             ownerSqid,
				FirstName:      invite.Workspace.Owner.FirstName,
				LastName:       invite.Workspace.Owner.LastName,
				Email:          invite.Workspace.Owner.Email,
				Phone:          invite.Workspace.Owner.Phone,
				Company:        invite.Workspace.Owner.Company,
				ProfilePicture: invite.Workspace.Owner.ProfilePicture,
			},
		},
	}

	return &inviteResponse, nil
}
