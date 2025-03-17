package controllers

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"github.com/gofiber/fiber/v3"
)

func WorkflowsIndex(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the workflows for the workspace.
	workflows, err := db.GetWorkflowsByWorkspaceID(workspace.ID)
	if err != nil {
		log.Printf("Error retrieving workflows: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Structure the response.
	var workflowsResponse []db.WorkflowResponse
	for _, workflow := range workflows {
		ownerSqid, err := utils.EncodeSqids("users", uint64(workflow.OwnerID))
		if err != nil {
			log.Printf("Error encoding owner sqid: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
		ownerResponse := db.UserResponse{
			ID:             ownerSqid,
			FirstName:      workflow.Owner.FirstName,
			LastName:       workflow.Owner.LastName,
			Email:          workflow.Owner.Email,
			Phone:          workflow.Owner.Phone,
			Company:        workflow.Owner.Company,
			ProfilePicture: workflow.Owner.ProfilePicture,
		}
		workflowSqid, err := utils.EncodeSqids("workflows", uint64(workflow.ID))
		if err != nil {
			log.Printf("Error encoding workflow sqid: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
		workflowsResponse = append(workflowsResponse, db.WorkflowResponse{
			ID:          workflowSqid,
			Name:        workflow.Name,
			Description: workflow.Description,
			Status:      workflow.Status,
			Type:        workflow.Type,
			Owner:       ownerResponse,
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: workflowsResponse,
	})
}

func WorkflowsShow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Get the workflow response.
	workflowResponse, err := lib.GetWorkflowResponse(*workflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: workflowResponse,
	})
}

func WorkflowsUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name", "description", "documentation"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Update the workflow record.
	updatedWorkflow, err := db.UpdateWorkflow(workflow.ID, map[string]interface{}{
		"name":          fields["name"],
		"description":   fields["description"],
		"documentation": fields["documentation"],
	})
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := lib.GetWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workflow_updated"),
		Data:    workflowResponse,
	})
}

func WorkflowsDestroy(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Delete the workflow record.
	err := db.DeleteWorkflow(workflow.ID)
	if err != nil {
		log.Printf("Error deleting workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workflow_deleted"),
	})
}

func TransferWorkflowOwnership(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Decode the new owner ID.
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding new owner sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Update the workflow record.
	updatedWorkflow, err := db.UpdateWorkflow(workflow.ID, map[string]interface{}{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := lib.GetWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workflow_ownership_transferred"),
		Data:    workflowResponse,
	})
}
