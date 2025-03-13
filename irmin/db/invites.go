package db

import "gorm.io/gorm"

type Invite struct {
	gorm.Model

	FirstName   string            `json:"first_name"`
	LastName    string            `json:"last_name"`
	Email       string            `json:"email"`
	Phone       string            `json:"phone"`
	Company     string            `json:"company"`
	InvitedBy   User              `json:"invited_by" gorm:"foreignKey:InvitedByID"`
	InvitedByID uint              `json:"invited_by_id"`
	Role        UserWorkspaceRole `json:"role"`
}
