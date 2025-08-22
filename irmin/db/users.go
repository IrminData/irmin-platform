package db

import (
	"errors"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ClerkID          string          `json:"clerk_id"           gorm:"uniqueIndex"`
	NovuSubscriberID string          `json:"novu_subscriber_id"`
	FirstName        string          `json:"first_name"`
	LastName         string          `json:"last_name"`
	Email            string          `json:"email"              gorm:"index"`
	Phone            string          `json:"phone"`
	Company          string          `json:"company"`
	ProfilePicture   string          `json:"profile_picture"`
	Workspaces       []WorkspaceUser `json:"workspaces"         gorm:"foreignKey:UserID"`
}

type WorkspaceUserRole struct {
	gorm.Model
	WorkspaceUserID uint          `json:"workspace_user_id" gorm:"index"`
	WorkspaceUser   WorkspaceUser `json:"workspace_user"    gorm:"foreignKey:WorkspaceUserID"`
	RoleID          uint          `json:"role_id"           gorm:"index"`
	Role            Role          `json:"role"              gorm:"foreignKey:RoleID"`
}

type WorkspaceUser struct {
	gorm.Model
	UserID      uint                `json:"user_id"      gorm:"index"`
	User        User                `json:"user"         gorm:"foreignKey:UserID"`
	WorkspaceID uint                `json:"workspace_id" gorm:"index"`
	Workspace   Workspace           `json:"workspace"    gorm:"foreignKey:WorkspaceID"`
	Roles       []WorkspaceUserRole `json:"roles"        gorm:"foreignKey:WorkspaceUserID"`
	Policies    []Policy            `json:"policies"     gorm:"foreignKey:WorkspaceUserID"`
}

// GetUser retrieves a user from the database by their ID.
func (d *Database) GetUser(id uint) (*User, error) {
	var user User
	if err := d.Preload("Workspaces").Preload("Workspaces.Roles").Preload("Workspaces.Roles.Role").First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByEmail retrieves a user from the database by their email.
func (d *Database) GetUserByEmail(email string) (*User, error) {
	var user User
	if err := d.Preload("Workspaces").Preload("Workspaces.Roles").Preload("Workspaces.Roles.Role").Where(&User{Email: email}).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByClerkID retrieves a user from the database by their ClerkID.
func (d *Database) GetUserByClerkID(clerkID string) (*User, error) {
	var user User
	if err := d.Preload("Workspaces").Preload("Workspaces.Roles").Preload("Workspaces.Roles.Role").Where(&User{ClerkID: clerkID}).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetWorkspaceUser retrieves a workspace user record from the database by the workspace and user IDs.
func (d *Database) GetWorkspaceUser(workspaceID, userID uint) (*WorkspaceUser, error) {
	var workspaceUser WorkspaceUser
	if err := d.Preload("User").Preload("Roles").Preload("Roles.Role").Where(&WorkspaceUser{WorkspaceID: workspaceID, UserID: userID}).Order("created_at desc").First(&workspaceUser).Error; err != nil {
		return nil, err
	}
	return &workspaceUser, nil
}

// GetUserWorkspaces retrieves all workspace associations (WorkspaceUser)
// for a given user ID. It preloads the related Workspace.
func (d *Database) GetUserWorkspaces(userID uint) ([]WorkspaceUser, error) {
	var workspaceUsers []WorkspaceUser
	if err := d.Where(&WorkspaceUser{UserID: userID}).
		Preload("Workspace").
		Preload("Workspace.Owner").
		Preload("Roles").
		Preload("Roles.Role").
		Order("created_at desc").
		Find(&workspaceUsers).Error; err != nil {
		return nil, err
	}
	return workspaceUsers, nil
}

// IsUserInWorkspace checks if a user is a member of a workspace.
func (d *Database) IsUserInWorkspace(userID, workspaceID uint) (bool, error) {
	var workspaceUser WorkspaceUser
	if err := d.Where(&WorkspaceUser{UserID: userID, WorkspaceID: workspaceID}).Preload("Roles").Preload("Roles.Role").First(&workspaceUser).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// IsUserInWorkspaceByEmail checks if a user with the provided email is a member of a workspace.
func (d *Database) IsUserInWorkspaceByEmail(email string, workspaceID uint) (bool, error) {
	// Query the User table for a record that matches the provided email.
	var user User
	if err := d.Where(&User{Email: email}).Preload("Workspaces").Preload("Workspaces.Role").First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Return false if the user is not found.
			return false, nil
		}
		return false, err
	}
	// Check if the user is a member of the workspace.
	return d.IsUserInWorkspace(user.ID, workspaceID)
}

// GetUsersInWorkspace retrieves all users associated with a workspace.
func (d *Database) GetUsersInWorkspace(workspaceID uint) ([]WorkspaceUser, error) {
	var workspaceUsers []WorkspaceUser
	if err := d.Where(&WorkspaceUser{WorkspaceID: workspaceID}).
		Preload("User").
		Preload("Roles").
		Preload("Roles.Role").
		Order("created_at desc").
		Find(&workspaceUsers).Error; err != nil {
		return nil, err
	}
	return workspaceUsers, nil
}

// AddUserToWorkspace adds a user to a workspace with the specified roles.
func (d *Database) AddUserToWorkspace(tx *gorm.DB, userID, workspaceID uint, roleIDs []uint) (*WorkspaceUser, error) {
	// Create the workspace user record
	workspaceUser := &WorkspaceUser{
		UserID:      userID,
		WorkspaceID: workspaceID,
	}
	if err := tx.Create(workspaceUser).Error; err != nil {
		return nil, err
	}

	// Add roles
	for _, roleID := range roleIDs {
		workspaceUserRole := &WorkspaceUserRole{
			WorkspaceUserID: workspaceUser.ID,
			RoleID:          roleID,
		}
		if err := tx.Create(workspaceUserRole).Error; err != nil {
			return nil, err
		}
	}

	// Reload the workspace user with roles
	if err := tx.Preload("User").Preload("Roles").Preload("Roles.Role").First(workspaceUser, workspaceUser.ID).Error; err != nil {
		return nil, err
	}

	return workspaceUser, nil
}

// RemoveUserFromWorkspace removes a user from a workspace.
func (d *Database) RemoveUserFromWorkspace(tx *gorm.DB, userID, workspaceID uint) error {
	// Get the workspace user
	workspaceUser := &WorkspaceUser{}
	if err := tx.Where(&WorkspaceUser{UserID: userID, WorkspaceID: workspaceID}).First(workspaceUser).Error; err != nil {
		return err
	}

	// Delete the WorkspaceUserRole records that match the workspace user ID.
	if err := tx.Where(&WorkspaceUserRole{WorkspaceUserID: workspaceUser.ID}).Delete(&WorkspaceUserRole{}).Error; err != nil {
		return err
	}

	// Delete the WorkspaceUser record.
	if err := tx.Delete(workspaceUser).Error; err != nil {
		return err
	}

	return nil
}

// UpdateWorkspaceUserRoles updates the roles for a user in a workspace.
func (d *Database) UpdateWorkspaceUserRoles(
	tx *gorm.DB,
	userID, workspaceID uint,
	roleIDs []uint,
) (*WorkspaceUser, error) {
	// Get the workspace user
	workspaceUser := &WorkspaceUser{}
	if err := tx.Where(&WorkspaceUser{UserID: userID, WorkspaceID: workspaceID}).First(workspaceUser).Error; err != nil {
		return nil, err
	}

	// Delete existing roles
	if err := tx.Where(&WorkspaceUserRole{WorkspaceUserID: workspaceUser.ID}).Delete(&WorkspaceUserRole{}).Error; err != nil {
		return nil, err
	}

	// Add new roles
	for _, roleID := range roleIDs {
		workspaceUserRole := &WorkspaceUserRole{
			WorkspaceUserID: workspaceUser.ID,
			RoleID:          roleID,
		}
		if err := tx.Create(workspaceUserRole).Error; err != nil {
			return nil, err
		}
	}

	// Reload the workspace user with roles
	if err := tx.Preload("User").Preload("Roles").Preload("Roles.Role").First(workspaceUser, workspaceUser.ID).Error; err != nil {
		return nil, err
	}

	return workspaceUser, nil
}
