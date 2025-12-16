package controllers

import (
	"irmin-api/locales"
	"irmin-api/services"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RolesIndex godoc
// @Summary List system roles
// @Description Get all available system roles that can be assigned to users
// @Tags roles
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Role} "Roles retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /roles [get]
func (api *APIControllers) RolesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		return api.handleServiceError(
			c,
			"Error getting locals for RolesIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the roles
	roles, err := api.Services.ListRoles(c)
	if err != nil {
		return api.handleServiceError(c, "Error getting roles", err, dict)
	}

	// Return the roles.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: roles,
	})
}
