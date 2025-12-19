package services

import (
	"context"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ListTemplatesByType retrieves all templates of a specific type.
func (api *APIServices) ListTemplatesByType(
	c context.Context,
	templateType irminmodels.TemplateType,
) ([]db.Template, error) {
	// Get templates from the database
	templates, err := api.DB.GetTemplatesByType(templateType)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching templates", "type", templateType, "error", err)
		return nil, NewInternalErrorf("error fetching templates: %w", err)
	}

	return templates, nil
}
