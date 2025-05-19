package db

import (
	"time"

	"gorm.io/gorm"
)

type Invite struct {
	gorm.Model

	Email       string            `json:"email"`
	ClerkID     string            `json:"clerk_id"`
	AcceptedAt  *time.Time        `json:"accepted_at"`
	DeclinedAt  *time.Time        `json:"declined_at"`
	ExpiresAt   time.Time         `json:"expires_at"`
	Role        UserWorkspaceRole `json:"role"`
	InvitedBy   User              `json:"invited_by"    gorm:"foreignKey:InvitedByID"`
	InvitedByID uint              `json:"invited_by_id"`
	Workspace   Workspace         `json:"workspace"     gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint              `json:"workspace_id"`
}

func (d *Database) GetInvitesByWorkspace(workspaceID uint) ([]Invite, error) {
	var invites []Invite
	result := d.Preload("InvitedBy").
		Preload("Workspace").
		Where("workspace_id = ?", workspaceID).
		Order("created_at desc").
		Find(&invites)
	if result.Error != nil {
		return nil, result.Error
	}
	return invites, nil
}

func (d *Database) GetInvitesByEmail(email string) ([]Invite, error) {
	var invites []Invite
	result := d.Preload("InvitedBy").
		Preload("Workspace").
		Where("email = ?", email).
		Order("created_at desc").
		Find(&invites)
	if result.Error != nil {
		return nil, result.Error
	}
	return invites, nil
}

func (d *Database) GetInviteByID(id uint) (*Invite, error) {
	var invite Invite
	result := d.Preload("InvitedBy").Preload("Workspace").First(&invite, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &invite, nil
}

func (d *Database) DeleteInvite(id uint) error {
	if err := d.Delete(&Invite{}, id).Error; err != nil {
		return err
	}
	return nil
}
