package services

import (
	"context"
	"irmin-api/formatter"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

func (api *APIServices) ListRoles(c context.Context) ([]irminmodels.Role, error) {
	// No permissions check needed for this route

	// Get the roles from the database
	roles, err := api.DB.GetRoles()
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting roles", "error", err)
		return nil, err
	}

	// Format the roles
	rolesResponse, err := formatter.FormatIndexResponse(roles, formatter.FormatRoleResponse, api.SQIDManager)
	if err != nil {
		api.Logger.ErrorContext(c, "Error formatting roles response", "error", err)
		return nil, err
	}

	return rolesResponse, nil
}
