package controllers

import (
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

type RoleResponse struct {
	Description string `json:"description"`
	Label       string `json:"label"`
	Name        string `json:"name"` // e.g. "admin", "editor", "viewer"
}

func RolesIndex(c fiber.Ctx) error {
	// Define the roles.
	rolesResponse := []RoleResponse{
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
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: rolesResponse,
	})
}
