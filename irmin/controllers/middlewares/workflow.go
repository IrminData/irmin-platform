package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// WorkflowMiddleware verifies that the user has access to the workflow they are trying to access.
func (api *APIMiddlewares) WorkflowMiddleware(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the workflow sqid from the request URL.
	workflowSqid := c.Params("workflow")
	if workflowSqid == "" {
		log.Printf("No workflow selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the workflow ID.
	workflowID, err := utils.DecodeSqids("workflows", workflowSqid)
	if err != nil {
		log.Printf("Error decoding workflow sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow by its ID.
	workflow, err := api.DB.GetWorkflowByID(uint(workflowID))
	if err != nil {
		log.Printf("Error retrieving workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Check if the workflow belongs to the workspace.
	if workflow.WorkspaceID != workspace.ID {
		log.Printf("Workflow does not belong to the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Set the workflow in the context for subsequent handlers.
	c.Locals("workflow", workflow)

	return c.Next()
}
