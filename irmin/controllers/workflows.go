package controllers

import (
	"irmin-api/db"
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
	workflowsResponse := make([]db.WorkflowResponse, len(workflows))
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

	// Find the workflowable
	var workflowable interface{}
	var err error
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		workflowable, err = db.GetImportWorkflowableByID(*workflow.ImportID)
	case db.WorkflowableTypeExport:
		workflowable, err = db.GetExportWorkflowableByID(*workflow.ExportID)
	case db.WorkflowableTypeAction:
		workflowable, err = db.GetActionWorkflowableByID(*workflow.ActionID)
	case db.WorkflowableTypePipeline:
		workflowable, err = db.GetPipelineWorkflowableByID(*workflow.PipelineID)
	}
	if err != nil {
		log.Printf("Error retrieving workflowable: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Structure the owner response.
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

	// Structure the workflowable response.
	workflowableResponse := db.WorkflowableResponse{
		Type: workflow.Type,
	}
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		importWorkflowable := workflowable.(*db.ImportWorkflowable)
		connectionSqid, _ := utils.EncodeSqids("connections", uint64(importWorkflowable.ConnectionID))
		workflowableResponse.ConnectionID = connectionSqid
		workflowableResponse.ConnectionPath = importWorkflowable.ConnectionPath
		workflowableResponse.Repository = importWorkflowable.Repository.Slug
		workflowableResponse.Branch = importWorkflowable.Branch
		workflowableResponse.Path = importWorkflowable.Path
	case db.WorkflowableTypeExport:
		exportWorkflowable := workflowable.(*db.ExportWorkflowable)
		connectionSqid, _ := utils.EncodeSqids("connections", uint64(exportWorkflowable.ConnectionID))
		workflowableResponse.ConnectionID = connectionSqid
		workflowableResponse.ConnectionPath = exportWorkflowable.ConnectionPath
		workflowableResponse.Repository = exportWorkflowable.Repository.Slug
		workflowableResponse.Branch = exportWorkflowable.Branch
		workflowableResponse.Path = exportWorkflowable.Path
		workflowableResponse.Recursive = exportWorkflowable.Recursive
	case db.WorkflowableTypeAction:
		actionWorkflowable := workflowable.(*db.ActionWorkflowable)
		workflowableResponse.Executable = actionWorkflowable.Executable
		workflowableResponse.Repository = actionWorkflowable.Repository.Slug
		workflowableResponse.Branch = *actionWorkflowable.Branch
		workflowableResponse.Path = *actionWorkflowable.Path
	case db.WorkflowableTypePipeline:
		pipelineWorkflowable := workflowable.(*db.PipelineWorkflowable)
		workflowableResponse.Live = pipelineWorkflowable.Live
		stagesResponse := make([]db.PipelineStageResponse, len(pipelineWorkflowable.Stages))
		for _, stage := range pipelineWorkflowable.Stages {
			connectionSqid, _ := utils.EncodeSqids("connections", uint64(*stage.ConnectionID))
			repositorySlug := stage.Repository.Slug
			stageResponse := db.PipelineStageResponse{
				Description:         stage.Description,
				Write:               stage.Write,
				Read:                stage.Read,
				Type:                stage.Type,
				Executable:          stage.Executable,
				ConnectionWritePath: stage.ConnectionWritePath,
				ConnectionReadPath:  stage.ConnectionReadPath,
				RepositoryBranch:    stage.RepositoryBranch,
				RepositoryPath:      stage.RepositoryPath,
				ConnectionID:        &connectionSqid,
				Repository:          &repositorySlug,
			}
			stagesResponse = append(stagesResponse, stageResponse)
		}
		workflowableResponse.Stages = stagesResponse
	}

	// Structure the schedule response
	scheduleTriggersResponse := make([]db.WorkflowTriggerResponse, len(workflow.Schedule.Triggers))
	for _, trigger := range workflow.Schedule.Triggers {
		var repositorySlug *string
		if trigger.Repository != nil {
			repositorySlug = &trigger.Repository.Slug
		}
		var workflowSqid *string
		if trigger.Workflow != nil {
			sqid, err := utils.EncodeSqids("workflows", uint64(*trigger.WorkflowID))
			if err != nil {
				log.Printf("Error encoding workflow sqid: %v", err)
				return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
					Errors: []string{dict.T("error_occured")},
				})
			}
			workflowSqid = &sqid
		}
		scheduleTriggersResponse = append(scheduleTriggersResponse, db.WorkflowTriggerResponse{
			Type:             trigger.Type,
			RRule:            trigger.RRule,
			Cron:             trigger.Cron,
			RepositoryEvent:  trigger.RepositoryEvent,
			Repository:       repositorySlug,
			RepositoryRef:    trigger.RepositoryRef,
			WorkflowID:       workflowSqid,
			WorkflowRunEvent: trigger.WorkflowRunEvent,
		})
	}
	scheduleResponse := db.ScheduleResponse{
		Triggers:    scheduleTriggersResponse,
		MaxRetries:  workflow.Schedule.MaxRetries,
		MaxRuntime:  workflow.Schedule.MaxRuntime,
		MinInterval: workflow.Schedule.MinInterval,
	}

	// Structure the workflow response.
	workflowSqid, err := utils.EncodeSqids("workflows", uint64(workflow.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	workflowResponse := db.WorkflowResponse{
		ID:            workflowSqid,
		Name:          workflow.Name,
		Description:   workflow.Description,
		Documentation: workflow.Documentation,
		Status:        workflow.Status,
		Type:          workflow.Type,
		Owner:         ownerResponse,
		Schedule:      &scheduleResponse,
		Workflowable:  &workflowableResponse,
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

	// Structure the owner response.
	ownerSqid, err := utils.EncodeSqids("users", uint64(updatedWorkflow.OwnerID))
	if err != nil {
		log.Printf("Error encoding owner sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	ownerResponse := db.UserResponse{
		ID:             ownerSqid,
		FirstName:      updatedWorkflow.Owner.FirstName,
		LastName:       updatedWorkflow.Owner.LastName,
		Email:          updatedWorkflow.Owner.Email,
		Phone:          updatedWorkflow.Owner.Phone,
		Company:        updatedWorkflow.Owner.Company,
		ProfilePicture: updatedWorkflow.Owner.ProfilePicture,
	}

	// Structure the workflow response.
	workflowSqid, err := utils.EncodeSqids("workflows", uint64(updatedWorkflow.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	workflowResponse := db.WorkflowResponse{
		ID:            workflowSqid,
		Name:          updatedWorkflow.Name,
		Description:   updatedWorkflow.Description,
		Documentation: updatedWorkflow.Documentation,
		Status:        updatedWorkflow.Status,
		Type:          updatedWorkflow.Type,
		Owner:         ownerResponse,
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

	// Structure the owner response.
	ownerSqid, err := utils.EncodeSqids("users", uint64(updatedWorkflow.OwnerID))
	if err != nil {
		log.Printf("Error encoding owner sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	ownerResponse := db.UserResponse{
		ID:             ownerSqid,
		FirstName:      updatedWorkflow.Owner.FirstName,
		LastName:       updatedWorkflow.Owner.LastName,
		Email:          updatedWorkflow.Owner.Email,
		Phone:          updatedWorkflow.Owner.Phone,
		Company:        updatedWorkflow.Owner.Company,
		ProfilePicture: updatedWorkflow.Owner.ProfilePicture,
	}

	// Structure the workflow response.
	workflowSqid, err := utils.EncodeSqids("workflows", uint64(updatedWorkflow.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	workflowResponse := db.WorkflowResponse{
		ID:            workflowSqid,
		Name:          updatedWorkflow.Name,
		Description:   updatedWorkflow.Description,
		Documentation: updatedWorkflow.Documentation,
		Status:        updatedWorkflow.Status,
		Type:          updatedWorkflow.Type,
		Owner:         ownerResponse,
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workflow_ownership_transferred"),
		Data:    workflowResponse,
	})
}
