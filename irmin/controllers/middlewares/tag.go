package middlewares

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// TagMiddleware parses the tag name from the request URL and sets the tag in the context.
func TagMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the tag name from the request URL.
	tagName := c.Params("tag")
	if tagName == "" {
		log.Printf("No tag selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the tag from the data engine.
	dataEngineTag, err := dataEngine.GetTag(workspace.Slug, repository.Slug, tagName)
	if err != nil {
		log.Printf("Error retrieving tag from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the tag in the context for subsequent handlers.
	c.Locals("tag", dataEngineTag)

	return c.Next()
}
