package db

import (
	"time"

	"gorm.io/gorm"
)

type Invite struct {
	gorm.Model

	Email       string     `json:"email"         gorm:"index"`
	ClerkID     string     `json:"clerk_id"`
	AcceptedAt  *time.Time `json:"accepted_at"`
	DeclinedAt  *time.Time `json:"declined_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	Role        Role       `json:"role"          gorm:"foreignKey:RoleID"`
	RoleID      uint       `json:"role_id"       gorm:"index"`
	InvitedBy   User       `json:"invited_by"    gorm:"foreignKey:InvitedByID"`
	InvitedByID uint       `json:"invited_by_id"`
	Workspace   Workspace  `json:"workspace"     gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint       `json:"workspace_id"  gorm:"index"`
}

func (d *Database) GetActiveInvitesByWorkspace(workspaceID uint) ([]Invite, error) {
	var invites []Invite
	result := d.Preload("InvitedBy").
		Preload("Workspace").
		Preload("Workspace.Owner").
		Preload("Role").
		Where("workspace_id = ?", workspaceID).
		Where("accepted_at IS NULL").
		Where("declined_at IS NULL").
		Where("expires_at > ?", time.Now().UTC()).
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
		Preload("Workspace.Owner").
		Preload("Role").
		Where("email = ?", email).
		Where("accepted_at IS NULL").
		Where("declined_at IS NULL").
		Where("expires_at > ?", time.Now().UTC()).
		Order("created_at desc").
		Find(&invites)
	if result.Error != nil {
		return nil, result.Error
	}
	return invites, nil
}

func (d *Database) GetInviteByID(id uint) (*Invite, error) {
	var invite Invite
	result := d.Preload("InvitedBy").Preload("Workspace").Preload("Workspace.Owner").Preload("Role").First(&invite, id)
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
