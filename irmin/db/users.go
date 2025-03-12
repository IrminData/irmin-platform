package db

import "gorm.io/gorm"

type User struct {
	gorm.Model
	ClerkID            string          `json:"clerk_id" gorm:"uniqueIndex"`
	FirstName          string          `json:"first_name"`
	LastName           string          `json:"last_name"`
	Email              string          `json:"email"`
	Phone              string          `json:"phone"`
	Company            string          `json:"company"`
	ProfilePicture     string          `json:"profile_picture"`
	Workspaces         []WorkspaceUser `json:"workspaces" gorm:"foreignKey:UserID"`
	CurrentWorkspaceID *uint           `json:"current_workspace_id"`
	CurrentWorkspace   *Workspace      `json:"current_workspace" gorm:"foreignKey:CurrentWorkspaceID"`
}

type WorkspaceUser struct {
	gorm.Model

	UserID      uint      `json:"user_id"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	WorkspaceID uint      `json:"workspace_id"`
	Workspace   Workspace `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	Roles       []Role    `json:"roles" gorm:"many2many:workspace_user_roles;"`
}

// GetUser retrieves a user from the database by their ID
func GetUser(id uint) (*User, error) {
	var user User
	if err := DB.Preload("Workspaces").Preload("CurrentWorkspace").Preload("Roles").First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByClerkID retrieves a user from the database by their ClerkID.
func GetUserByClerkID(clerkID string) (*User, error) {
	var user User
	if err := DB.Where("clerk_id = ?", clerkID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// CreateUser creates a new user record in the database.
func CreateUser(user *User) (*User, error) {
	if err := DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser updates an existing user record in the database.
func UpdateUser(id uint, updates interface{}) (*User, error) {
	var user User
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&User{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated user record.
	if err := DB.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
