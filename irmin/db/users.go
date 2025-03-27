package db

import "gorm.io/gorm"

type UserWorkspaceRole string

const (
	RoleAdmin  UserWorkspaceRole = "admin"
	RoleEditor UserWorkspaceRole = "editor"
	RoleViewer UserWorkspaceRole = "viewer"
)

type User struct {
	gorm.Model
	ClerkID        string          `json:"clerk_id" gorm:"uniqueIndex"`
	FirstName      string          `json:"first_name"`
	LastName       string          `json:"last_name"`
	Email          string          `json:"email"`
	Phone          string          `json:"phone"`
	Company        string          `json:"company"`
	ProfilePicture string          `json:"profile_picture"`
	Workspaces     []WorkspaceUser `json:"workspaces" gorm:"foreignKey:UserID"`
}

type WorkspaceUser struct {
	gorm.Model
	UserID      uint                `json:"user_id"`
	User        User                `json:"user" gorm:"foreignKey:UserID"`
	WorkspaceID uint                `json:"workspace_id"`
	Workspace   Workspace           `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	Roles       []UserWorkspaceRole `json:"roles" gorm:"type:jsonb;serializer:json"`
}

// GetUser retrieves a user from the database by their ID
func GetUser(id uint) (*User, error) {
	var user User
	if err := DB.Preload("Workspaces").First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByClerkID retrieves a user from the database by their ClerkID.
func GetUserByClerkID(clerkID string) (*User, error) {
	var user User
	if err := DB.Preload("Workspaces").Where("clerk_id = ?", clerkID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetWorkspaceUser retrieves a workspace user record from the database by the workspace and user IDs.
func GetWorkspaceUser(workspaceID, userID uint) (*WorkspaceUser, error) {
	var workspaceUser WorkspaceUser
	if err := DB.Preload("User").Where("workspace_id = ? AND user_id = ?", workspaceID, userID).First(&workspaceUser).Error; err != nil {
		return nil, err
	}
	return &workspaceUser, nil
}

// CreateUser creates a new user record in the database.
func CreateUser(user *User) (*User, error) {
	if err := DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser updates an existing user record in the database.
func UpdateUser(id uint, updates map[string]any) (*User, error) {
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

// GetUserWorkspaces retrieves all workspace associations (WorkspaceUser)
// for a given user ID. It preloads the related Workspace.
func GetUserWorkspaces(userID uint) ([]WorkspaceUser, error) {
	// Define a slice to hold the WorkspaceUser records.
	var workspaceUsers []WorkspaceUser
	// Query the WorkspaceUser table using the provided user ID,
	// and preload associated Workspace.
	if err := DB.Where("user_id = ?", userID).
		Preload("Workspace").
		Find(&workspaceUsers).Error; err != nil {
		return nil, err
	}
	return workspaceUsers, nil
}

// IsUserInWorkspace checks if a user is a member of a workspace.
func IsUserInWorkspace(userID, workspaceID uint) (bool, error) {
	// Query the WorkspaceUser table for a record that matches the provided user and workspace IDs.
	var workspaceUser WorkspaceUser
	if err := DB.Where("user_id = ? AND workspace_id = ?", userID, workspaceID).First(&workspaceUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return false if the record is not found.
			return false, nil
		}
		return false, err
	}
	// Return true if the record is found.
	return true, nil
}

// IsUserInWorkspaceByEmail checks if a user with the provided email is a member of a workspace.
func IsUserInWorkspaceByEmail(email string, workspaceID uint) (bool, error) {
	// Query the User table for a record that matches the provided email.
	var user User
	if err := DB.Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return false if the user is not found.
			return false, nil
		}
		return false, err
	}
	// Check if the user is a member of the workspace.
	return IsUserInWorkspace(user.ID, workspaceID)
}

// GetUsersInWorkspace retrieves all users associated with a workspace.
func GetUsersInWorkspace(workspaceID uint) ([]WorkspaceUser, error) {
	// Define a slice to hold the WorkspaceUser records.
	var workspaceUsers []WorkspaceUser
	// Query the WorkspaceUser table using the provided workspace ID,
	// and preload associated User.
	if err := DB.Where("workspace_id = ?", workspaceID).
		Preload("User").
		Find(&workspaceUsers).Error; err != nil {
		return nil, err
	}
	return workspaceUsers, nil
}

// AddUserToWorkspace adds a user to a workspace with the specified roles.
func AddUserToWorkspace(userID, workspaceID uint, roles []UserWorkspaceRole) (*WorkspaceUser, error) {
	// Create a new WorkspaceUser record.
	workspaceUser := &WorkspaceUser{
		UserID:      userID,
		WorkspaceID: workspaceID,
		Roles:       roles,
	}
	// Insert the record into the database.
	if err := DB.Preload("User").Create(workspaceUser).Error; err != nil {
		return nil, err
	}
	return workspaceUser, nil
}

// RemoveUserFromWorkspace removes a user from a workspace.
func RemoveUserFromWorkspace(userID, workspaceID uint) error {
	// Delete the WorkspaceUser record that matches the provided user and workspace IDs.
	return DB.Where("user_id = ? AND workspace_id = ?", userID, workspaceID).Delete(&WorkspaceUser{}).Error
}

// UpdateWorkspaceUserRoles updates the roles for a user in a workspace.
func UpdateWorkspaceUserRoles(userID, workspaceID uint, roles []UserWorkspaceRole) (*WorkspaceUser, error) {
	// Create a new WorkspaceUser record with the updated roles.
	workspaceUser := &WorkspaceUser{
		UserID:      userID,
		WorkspaceID: workspaceID,
		Roles:       roles,
	}
	// Update the record in the database.
	if err := DB.Preload("User").Where("user_id = ? AND workspace_id = ?", userID, workspaceID).Updates(workspaceUser).Error; err != nil {
		return nil, err
	}
	return workspaceUser, nil
}
