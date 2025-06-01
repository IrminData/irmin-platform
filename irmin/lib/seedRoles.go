package lib

import (
	"errors"
	"irmin-api/db"

	"gorm.io/gorm"
)

// SeedRoles seeds the database with the default roles.
func SeedRoles(d *db.Database) error {
	// defaultRoles holds the list of roles we want to ensure are present.
	defaultRoles := []db.Role{
		{
			Role:        "viewer",
			Description: "User with read-only access to content",
			IsDefault:   true,
			IsOwner:     false,
		},
		{
			Role:        "editor",
			Description: "User with content creation and editing privileges",
			IsDefault:   false,
			IsOwner:     false,
		},
		{
			Role:        "admin",
			Description: "Full system access with administrative privileges, without ownership",
			IsDefault:   false,
			IsOwner:     false,
		},
		{
			Role:        "owner",
			Description: "Full system access with administrative privileges, with ownership",
			IsDefault:   false,
			IsOwner:     true,
		},
		{
			Role:        "billing",
			Description: "User with billing and subscription management access",
			IsDefault:   false,
			IsOwner:     false,
		},
		{
			Role:        "guest",
			Description: "User without access to anything, but can be added to specific resources",
			IsDefault:   false,
			IsOwner:     false,
		},
	}

	for _, def := range defaultRoles {
		var existing db.Role
		// Attempt to find an existing Role by its name.
		findErr := d.Where("role = ?", def.Role).First(&existing).Error
		switch {
		case findErr != nil && !errors.Is(findErr, gorm.ErrRecordNotFound):
			// An unexpected error occurred when querying.
			return findErr
		case errors.Is(findErr, gorm.ErrRecordNotFound):
			// Role not found; create it now.
			if createErr := d.Create(&def).Error; createErr != nil {
				return createErr
			}
		default:
			// Role exists, update its details
			existing.Description = def.Description
			existing.IsDefault = def.IsDefault
			existing.IsOwner = def.IsOwner
			if saveErr := d.Save(&existing).Error; saveErr != nil {
				return saveErr
			}
		}
	}

	return nil
}
