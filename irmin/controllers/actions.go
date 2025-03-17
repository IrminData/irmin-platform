package controllers

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"github.com/gofiber/fiber/v3"
)

func ActionWorkflowsIndex(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get all action workflows for the workspace.
	workflows, err := db.GetWorkflowsOfTypeByWorkspaceID(workspace.ID, "action")
	if err != nil {
		log.Printf("Error retrieving action workflows: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Structure the response.
	var workflowsResponse []db.WorkflowResponse
	for _, workflow := range workflows {
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

		// Structure the workflow response.
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

func ActionWorkflowsStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name", "executable"}, []string{"description", "documentation", "repository", "branch", "path"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse the schedule object from the request body.
	schedule, err := lib.CreateScheduleObject(c, *workspace)
	if err != nil {
		log.Printf("Error creating schedule object: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Create the schedule in the database.
	schedule, err = db.CreateSchedule(schedule)
	if err != nil {
		log.Printf("Error creating schedule: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Find the results repository by slug.
	var repository *db.Repository
	if fields["repository"] != "" {
		repository, err = db.GetRepositoryBySlugAndWorkspaceID(fields["repository"], workspace.ID)
		if err != nil {
			log.Printf("Error retrieving repository: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
	}

	// Create the workflowable object.
	var workflowable db.ActionWorkflowable
	if repository != nil {
		repositoryID := repository.ID
		branch := fields["branch"]
		path := fields["path"]
		workflowable = db.ActionWorkflowable{
			Executable:   fields["executable"],
			RepositoryID: &repositoryID,
			Branch:       &branch,
			Path:         &path,
		}
	} else {
		workflowable = db.ActionWorkflowable{
			Executable: fields["executable"],
		}
	}

	// Create the workflowable in the database.
	actionWorkflowable, err := db.CreateActionWorkflowable(&workflowable)
	if err != nil {
		log.Printf("Error creating workflowable: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Create the workflow in the database.
	workflow, err := db.CreateWorkflow(&db.Workflow{
		Name:          fields["name"],
		Description:   fields["description"],
		Documentation: fields["documentation"],
		Type:          db.WorkflowableTypeAction,
		Status:        db.WorkflowStatusInitiating,
		OwnerID:       user.ID,
		WorkspaceID:   workspace.ID,
		ScheduleID:    &schedule.ID,
		ActionID:      &actionWorkflowable.ID,
	})
	if err != nil {
		log.Printf("Error creating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Fetch the full workflow object.
	workflow, err = db.GetWorkflowByID(workflow.ID)
	if err != nil {
		log.Printf("Error retrieving workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := lib.GetWorkflowResponse(*workflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusCreated, utils.IrminAPIResponse{
		Message: dict.T("workflow_created"),
		Data:    workflowResponse,
	})
}

func ActionWorkflowsUpdate(c fiber.Ctx) error {
	return c.SendString("Action Workflows Update")
}
