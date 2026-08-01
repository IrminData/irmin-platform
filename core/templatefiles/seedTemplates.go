package templatefiles

import (
	"fmt"
	"irmin-api/db"
	"log/slog"
)

// SeedTemplates loads embedded template files and upserts them into the database.
func SeedTemplates(database *db.Database, logger *slog.Logger) error {
	logger.Info("Starting template seeding")

	// Get all embedded templates
	templates, err := GetAllTemplates()
	if err != nil {
		return fmt.Errorf("failed to load templates: %w", err)
	}

	logger.Info("Loaded templates", "count", len(templates))

	var processedIDs []uint

	// Upsert each template into the database
	for _, tmpl := range templates {
		dbTemplate := &db.Template{
			Title:        tmpl.Title,
			Description:  tmpl.Description,
			Content:      tmpl.Content,
			Type:         tmpl.Type,
			Language:     tmpl.Language,
			Tags:         tmpl.Tags,
			Placeholders: tmpl.Placeholders,
		}

		if upsertErr := database.UpsertTemplate(dbTemplate); upsertErr != nil {
			logger.Error("Failed to upsert template", "title", tmpl.Title, "error", upsertErr)
			return fmt.Errorf("failed to upsert template %s: %w", tmpl.Title, upsertErr)
		}

		processedIDs = append(processedIDs, dbTemplate.ID)

		logger.Info("Upserted template", "title", tmpl.Title, "type", tmpl.Type)
	}

	// Remove templates that are no longer in the codebase
	if deleteOldTemplatesErr := database.DeleteTemplatesNotInIDs(processedIDs); deleteOldTemplatesErr != nil {
		logger.Error("Failed to remove old templates", "error", deleteOldTemplatesErr)
		return fmt.Errorf("failed to remove old templates: %w", deleteOldTemplatesErr)
	}

	logger.Info("Template seeding completed successfully")
	return nil
}
