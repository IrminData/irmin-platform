package controllers

import (
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func (api *APIControllers) RolesIndex(c fiber.Ctx) error {
	// Define the roles.
	rolesResponse := []irminmodels.Role{
		{
			Description: "Can perform all actions on the workspace",
			Label:       "Admin",
			Name:        "admin",
		},
		{
			Description: "Can perform all actions except managing access",
			Label:       "Editor",
			Name:        "editor",
		},
		{
			Description: "Can view all data but cannot make changes",
			Label:       "Viewer",
			Name:        "viewer",
		},
	}
	// Return the roles.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: rolesResponse,
	})
}
