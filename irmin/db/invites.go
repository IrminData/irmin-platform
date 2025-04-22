package db

import (
	"database/sql"
	"time"

	"gorm.io/gorm"
)

type Invite struct {
	gorm.Model

	Email       string            `json:"email"`
	ClerkID     string            `json:"clerk_id"`
	AcceptedAt  sql.NullTime      `json:"accepted_at"`
	DeclinedAt  sql.NullTime      `json:"declined_at"`
	ExpiresAt   time.Time         `json:"expires_at"`
	Role        UserWorkspaceRole `json:"role"`
	InvitedBy   User              `json:"invited_by" gorm:"foreignKey:InvitedByID"`
	InvitedByID uint              `json:"invited_by_id"`
	Workspace   Workspace         `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint              `json:"workspace_id"`
}

func GetInvitesByWorkspace(workspaceID uint) ([]Invite, error) {
	var invites []Invite
	result := DB.Preload("InvitedBy").Preload("Workspace").Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&invites)
	if result.Error != nil {
		return nil, result.Error
	}
	return invites, nil
}

func GetInvitesByEmail(email string) ([]Invite, error) {
	var invites []Invite
	result := DB.Preload("InvitedBy").Preload("Workspace").Where("email = ?", email).Order("created_at desc").Find(&invites)
	if result.Error != nil {
		return nil, result.Error
	}
	return invites, nil
}

func GetInviteByID(id uint) (*Invite, error) {
	var invite Invite
	result := DB.Preload("InvitedBy").Preload("Workspace").First(&invite, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &invite, nil
}

func CreateInvite(invite *Invite) (*Invite, error) {
	if err := DB.Create(invite).Error; err != nil {
		return nil, err
	}
	return invite, nil
}

func UpdateInvite(id uint, updates map[string]any) (*Invite, error) {
	var invite Invite
	if err := DB.Model(&Invite{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("InvitedBy").Preload("Workspace").First(&invite, id).Error; err != nil {
		return nil, err
	}
	return &invite, nil
}

func DeleteInvite(id uint) error {
	if err := DB.Delete(&Invite{}, id).Error; err != nil {
		return err
	}
	return nil
}
