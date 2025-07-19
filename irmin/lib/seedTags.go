package lib

import (
	"errors"
	"irmin-api/db"

	"gorm.io/gorm"
)

// SeedDefaultTags seeds a workspace with default tags.
func SeedDefaultTags(dbConn *gorm.DB, workspaceID uint) error {
	// defaultTags holds the list of default tags we want to create for each workspace.
	defaultTags := []db.Tag{
		{
			Name:        "Important",
			Color:       "#FF6B6B",
			Description: "High priority items that require immediate attention",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Archive",
			Color:       "#DDA0DD",
			Description: "Items that are no longer actively used",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Draft",
			Color:       "#FFEAA7",
			Description: "Work in progress or preliminary versions",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Final",
			Color:       "#45B7D1",
			Description: "Completed and finalized items",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Review",
			Color:       "#96CEB4",
			Description: "Items pending review or approval",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Data",
			Color:       "#4ECDC4",
			Description: "Data files, datasets, and raw information",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Workflow",
			Color:       "#80CBC4",
			Description: "Process definitions, automation scripts, and workflows",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Template",
			Color:       "#FFB347",
			Description: "Reusable templates and boilerplate files",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Reference",
			Color:       "#98D8C8",
			Description: "Reference materials, documentation, and guides",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Backup",
			Color:       "#F7DC6F",
			Description: "Backup files and safety copies",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Experimental",
			Color:       "#BB8FCE",
			Description: "Experimental or test files and workflows",
			WorkspaceID: workspaceID,
		},
		{
			Name:        "Production",
			Color:       "#85C1E9",
			Description: "Production-ready files and workflows",
			WorkspaceID: workspaceID,
		},
	}

	for _, def := range defaultTags {
		var existing db.Tag
		// Attempt to find an existing Tag by its name and workspace.
		findErr := dbConn.Where("name = ? AND workspace_id = ?", def.Name, workspaceID).First(&existing).Error
		switch {
		case findErr != nil && !errors.Is(findErr, gorm.ErrRecordNotFound):
			// An unexpected error occurred when querying.
			return findErr
		case errors.Is(findErr, gorm.ErrRecordNotFound):
			// Tag not found; create it now.
			if createErr := dbConn.Create(&def).Error; createErr != nil {
				return createErr
			}
		default:
			// Tag exists, update its details
			existing.Color = def.Color
			existing.Description = def.Description
			if saveErr := dbConn.Save(&existing).Error; saveErr != nil {
				return saveErr
			}
		}
	}

	return nil
}
