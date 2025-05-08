package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func WorkflowsIndex(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the filters from the query string.
	query, err := utils.ParseQueryParams(c, nil, []string{"type"})
	if err != nil {
		log.Printf("Error parsing query params: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	var workflows []db.Workflow
	if query["type"] != "" {
		// Get the workflows for the workspace filtered by type.
		workflows, err = db.GetWorkflowsOfTypeByWorkspaceID(workspace.ID, db.WorkflowableType(query["type"]))
		if err != nil {
			log.Printf("Error retrieving workflows: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else {
		// Get the workflows for the workspace.
		workflows, err = db.GetWorkflowsByWorkspaceID(workspace.ID)
		if err != nil {
			log.Printf("Error retrieving workflows: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	}

	// Structure the response.
	var workflowsResponse []irminmodels.Workflow
	for _, workflow := range workflows {
		workflowResponse, err := formatter.FormatWorkflowResponse(workflow)
		if err != nil {
			log.Printf("Error getting workflow response: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		workflowsResponse = append(workflowsResponse, *workflowResponse)
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workflowsResponse,
	})
}

func WorkflowsShow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*workflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workflowResponse,
	})
}

func WorkflowsUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workflow := c.Locals("workflow").(*db.Workflow)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name", "description", "documentation"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Update the workflow record.
	updatedWorkflow, err := db.UpdateWorkflow(workflow.ID, map[string]any{
		"name":          fields["name"],
		"description":   fields["description"],
		"documentation": fields["documentation"],
	})
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow settings updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("workflow_updated"),
		Data:    workflowResponse,
	})
}

func WorkflowsStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"type", "name"}, []string{"description", "documentation"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Create variables to store all possible workflowable objects.
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable

	// TOOD: This whole thing needs to be done in a transaction.

	// Procceed based on the workflow type.
	switch db.WorkflowableType(fields["type"]) {
	case db.WorkflowableTypeImport:
		// Create the import workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(
			c,
			[]string{"connection", "repository", "branch"},
			[]string{"connection_path", "path"},
		)
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the repository by slug.
		repository, err := db.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
		if err != nil {
			log.Printf("Error retrieving repository: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the connection by ID.
		connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
		if err != nil {
			log.Printf("Error decoding connection sqid: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		connection, err := db.GetConnectionByID(uint(connectionID))
		if err != nil {
			log.Printf("Error retrieving connection: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Create the workflowable in the database.
		importWorkflowable, err = db.CreateImportWorkflowable(&db.ImportWorkflowable{
			ConnectionID:   connection.ID,
			ConnectionPath: workflowableFields["connection_path"],
			RepositoryID:   repository.ID,
			Branch:         workflowableFields["branch"],
			Path:           workflowableFields["path"],
		})
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	case db.WorkflowableTypeExport:
		// Create the export workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(
			c,
			[]string{"connection", "repository", "branch"},
			[]string{"connection_path", "path"},
		)
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the repository by slug.
		repository, err := db.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
		if err != nil {
			log.Printf("Error retrieving repository: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the connection by ID.
		connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
		if err != nil {
			log.Printf("Error decoding connection sqid: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		connection, err := db.GetConnectionByID(uint(connectionID))
		if err != nil {
			log.Printf("Error retrieving connection: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Create the workflowable in the database.
		exportWorkflowable, err = db.CreateExportWorkflowable(&db.ExportWorkflowable{
			ConnectionID:   connection.ID,
			ConnectionPath: workflowableFields["connection_path"],
			RepositoryID:   repository.ID,
			Branch:         workflowableFields["branch"],
			Path:           workflowableFields["path"],
		})
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	case db.WorkflowableTypeAction:
		// Create the action workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(
			c,
			[]string{"executable"},
			[]string{"repository", "branch", "path"},
		)
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the results repository by slug.
		var repository *db.Repository
		if workflowableFields["repository"] != "" {
			repository, err = db.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
			if err != nil {
				log.Printf("Error retrieving repository: %v", err)
				return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
					Errors: []string{dict.T("invalid_request")},
				})
			}
		}
		// Create the workflowable object.
		var workflowable db.ActionWorkflowable
		if repository != nil {
			repositoryID := repository.ID
			branch := workflowableFields["branch"]
			path := workflowableFields["path"]
			workflowable = db.ActionWorkflowable{
				Executable:   workflowableFields["executable"],
				RepositoryID: &repositoryID,
				Branch:       &branch,
				Path:         &path,
			}
		} else {
			workflowable = db.ActionWorkflowable{
				Executable: workflowableFields["executable"],
			}
		}
		// Create the workflowable in the database.
		actionWorkflowable, err = db.CreateActionWorkflowable(&workflowable)
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	case db.WorkflowableTypePipeline:
		// Create the pipeline workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(c, nil, []string{"live"})
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Parse stages from the request body.
		requestStages, err := utils.ParseArrayFormFields(c, "stage")
		if err != nil {
			log.Printf("Error parsing array form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Build the pipeline stage objects.
		var stages []db.PipelineStage
		for _, stage := range requestStages {
			newStage := db.PipelineStage{
				Description: stage["description"],
				Write:       stage["write"] == "true",
				Read:        stage["read"] == "true",
			}
			switch stage["type"] {
			case "action":
				newStage.Type = db.PipelineStageTypeAction
				executable := stage["executable"]
				newStage.Executable = &executable
			case "connection":
				newStage.Type = db.PipelineStageTypeConnection
				parsedConnID, err := utils.DecodeSqids("connections", stage["connection"])
				if err != nil {
					log.Printf("Error decoding connection sqid: %v", err)
					continue
				}
				connection, err := db.GetConnectionByID(uint(parsedConnID))
				if err != nil {
					log.Printf("Error retrieving connection: %v", err)
					continue
				}
				writePath := stage["connection_write_path"]
				readPath := stage["connection_read_path"]
				newStage.ConnectionID = &connection.ID
				newStage.ConnectionWritePath = &writePath
				newStage.ConnectionReadPath = &readPath
			case "repository":
				newStage.Type = db.PipelineStageTypeRepository
				repositorySlug := stage["repository"]
				repository, err := db.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
				if err != nil {
					log.Printf("Error retrieving repository: %v", err)
					continue
				}
				branch := stage["branch"]
				path := stage["path"]
				newStage.RepositoryID = &repository.ID
				newStage.RepositoryBranch = &branch
				newStage.RepositoryPath = &path
			default:
				log.Printf("Invalid stage type: %s", stage["type"])
			}
			stages = append(stages, newStage)
		}

		// Create the pipeline workflowable object.
		live := false
		if workflowableFields["live"] == "true" {
			live = true
		}
		pipelineWorkflowable, err = db.CreatePipelineWorkflowable(&db.PipelineWorkflowable{
			Live:   live,
			Stages: stages,
		})
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	default:
		log.Printf("Invalid workflow type: %s", fields["type"])
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse the schedule object from the request body.
	schedule, err := lib.ParseScheduleFromRequest(c, *workspace)
	if err != nil {
		log.Printf("Error creating schedule object: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Create the schedule in the database.
	schedule, err = db.CreateSchedule(schedule)
	if err != nil {
		log.Printf("Error creating schedule: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create the workflow in the database.
	var workflow *db.Workflow
	if importWorkflowable != nil {
		workflow, err = db.CreateWorkflow(&db.Workflow{
			Name:          fields["name"],
			Description:   fields["description"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypeImport,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ImportID:      &importWorkflowable.ID,
		})
	} else if exportWorkflowable != nil {
		workflow, err = db.CreateWorkflow(&db.Workflow{
			Name:          fields["name"],
			Description:   fields["description"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypeExport,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ExportID:      &exportWorkflowable.ID,
		})
	} else if actionWorkflowable != nil {
		workflow, err = db.CreateWorkflow(&db.Workflow{
			Name:          fields["name"],
			Description:   fields["description"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypeAction,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ActionID:      &actionWorkflowable.ID,
		})
	} else if pipelineWorkflowable != nil {
		workflow, err = db.CreateWorkflow(&db.Workflow{
			Name:          fields["name"],
			Description:   fields["description"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypePipeline,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			PipelineID:    &pipelineWorkflowable.ID,
		})
	}
	if err != nil {
		log.Printf("Error creating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Fetch the full workflow object.
	workflow, err = db.GetWorkflowByID(workflow.ID)
	if err != nil {
		log.Printf("Error retrieving workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*workflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: "Workflow created",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: dict.T("workflow_created"),
		Data:    workflowResponse,
	})
}

func WorkflowableUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Create variables to store all possible workflowable objects.
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable

	// Procceed based on the workflow type.
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		// Create the import workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(
			c,
			[]string{"connection", "connection_path", "repository", "branch", "path"},
			nil,
		)
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the repository by slug.
		repository, err := db.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
		if err != nil {
			log.Printf("Error retrieving repository: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the connection by ID.
		connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
		if err != nil {
			log.Printf("Error decoding connection sqid: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		connection, err := db.GetConnectionByID(uint(connectionID))
		if err != nil {
			log.Printf("Error retrieving connection: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Create the workflowable in the database.
		importWorkflowable, err = db.CreateImportWorkflowable(&db.ImportWorkflowable{
			ConnectionID:   connection.ID,
			ConnectionPath: workflowableFields["connection_path"],
			RepositoryID:   repository.ID,
			Branch:         workflowableFields["branch"],
			Path:           workflowableFields["path"],
		})
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	case db.WorkflowableTypeExport:
		// Create the export workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(
			c,
			[]string{"connection", "connection_path", "repository", "branch", "path"},
			nil,
		)
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the repository by slug.
		repository, err := db.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
		if err != nil {
			log.Printf("Error retrieving repository: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the connection by ID.
		connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
		if err != nil {
			log.Printf("Error decoding connection sqid: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		connection, err := db.GetConnectionByID(uint(connectionID))
		if err != nil {
			log.Printf("Error retrieving connection: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Create the workflowable in the database.
		exportWorkflowable, err = db.CreateExportWorkflowable(&db.ExportWorkflowable{
			ConnectionID:   connection.ID,
			ConnectionPath: workflowableFields["connection_path"],
			RepositoryID:   repository.ID,
			Branch:         workflowableFields["branch"],
			Path:           workflowableFields["path"],
		})
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	case db.WorkflowableTypeAction:
		// Create the action workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(
			c,
			[]string{"executable"},
			[]string{"repository", "branch", "path"},
		)
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Find the results repository by slug.
		var repository *db.Repository
		if workflowableFields["repository"] != "" {
			repository, err = db.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
			if err != nil {
				log.Printf("Error retrieving repository: %v", err)
				return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
					Errors: []string{dict.T("invalid_request")},
				})
			}
		}
		// Create the workflowable object.
		var workflowable db.ActionWorkflowable
		if repository != nil {
			repositoryID := repository.ID
			branch := workflowableFields["branch"]
			path := workflowableFields["path"]
			workflowable = db.ActionWorkflowable{
				Executable:   workflowableFields["executable"],
				RepositoryID: &repositoryID,
				Branch:       &branch,
				Path:         &path,
			}
		} else {
			workflowable = db.ActionWorkflowable{
				Executable: workflowableFields["executable"],
			}
		}
		// Create the workflowable in the database.
		actionWorkflowable, err = db.CreateActionWorkflowable(&workflowable)
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	case db.WorkflowableTypePipeline:
		// Create the pipeline workflowable object.
		// Parse additional request body fields
		workflowableFields, err := utils.ParseFormFields(c, nil, []string{"live"})
		if err != nil {
			log.Printf("Error parsing form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Parse stages from the request body.
		requestStages, err := utils.ParseArrayFormFields(c, "stage")
		if err != nil {
			log.Printf("Error parsing array form fields: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		// Build the pipeline stage objects.
		var stages []db.PipelineStage
		for _, stage := range requestStages {
			newStage := db.PipelineStage{
				Description: stage["description"],
				Write:       stage["write"] == "true",
				Read:        stage["read"] == "true",
			}
			switch stage["type"] {
			case "action":
				newStage.Type = db.PipelineStageTypeAction
				executable := stage["executable"]
				newStage.Executable = &executable
			case "connection":
				newStage.Type = db.PipelineStageTypeConnection
				parsedConnID, err := utils.DecodeSqids("connections", stage["connection"])
				if err != nil {
					log.Printf("Error decoding connection sqid: %v", err)
					continue
				}
				connection, err := db.GetConnectionByID(uint(parsedConnID))
				if err != nil {
					log.Printf("Error retrieving connection: %v", err)
					continue
				}
				writePath := stage["connection_write_path"]
				readPath := stage["connection_read_path"]
				newStage.ConnectionID = &connection.ID
				newStage.ConnectionWritePath = &writePath
				newStage.ConnectionReadPath = &readPath
			case "repository":
				newStage.Type = db.PipelineStageTypeRepository
				repositorySlug := stage["repository"]
				repository, err := db.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
				if err != nil {
					log.Printf("Error retrieving repository: %v", err)
					continue
				}
				branch := stage["branch"]
				path := stage["path"]
				newStage.RepositoryID = &repository.ID
				newStage.RepositoryBranch = &branch
				newStage.RepositoryPath = &path
			default:
				log.Printf("Invalid stage type: %s", stage["type"])
			}
			stages = append(stages, newStage)
		}

		// Create the pipeline workflowable object.
		live := false
		if workflowableFields["live"] == "true" {
			live = true
		}
		pipelineWorkflowable, err = db.CreatePipelineWorkflowable(&db.PipelineWorkflowable{
			Live:   live,
			Stages: stages,
		})
		if err != nil {
			log.Printf("Error creating workflowable: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	default:
		log.Printf("Invalid workflow type: %s", workflow.Type)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Delete the current associated workflowable object.
	if workflow.Action != nil {
		// Delete the action workflowable object.
		db.DeleteActionWorkflowable(workflow.Action.ID)
	}
	if workflow.Import != nil {
		// Delete the import workflowable object.
		db.DeleteImportWorkflowable(workflow.Import.ID)
	}
	if workflow.Export != nil {
		// Delete the export workflowable object.
		db.DeleteExportWorkflowable(workflow.Export.ID)
	}
	if workflow.Pipeline != nil {
		// Delete the pipeline workflowable object and its stages.
		db.DeletePipelineWorkflowable(workflow.Pipeline.ID)
	}

	// Update the workflow record with the new workflowable object.
	var updatedWorkflow *db.Workflow
	var err error
	if importWorkflowable != nil {
		updatedWorkflow, err = db.UpdateWorkflow(workflow.ID, map[string]any{
			"import_id": &importWorkflowable.ID,
		})
	} else if exportWorkflowable != nil {
		updatedWorkflow, err = db.UpdateWorkflow(workflow.ID, map[string]any{
			"export_id": &exportWorkflowable.ID,
		})
	} else if actionWorkflowable != nil {
		updatedWorkflow, err = db.UpdateWorkflow(workflow.ID, map[string]any{
			"action_id": &actionWorkflowable.ID,
		})
	} else if pipelineWorkflowable != nil {
		updatedWorkflow, err = db.UpdateWorkflow(workflow.ID, map[string]any{
			"pipeline_id": &pipelineWorkflowable.ID,
		})
	}
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow workflowable configuration updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("workflow_updated"),
		Data:    workflowResponse,
	})
}

func ScheduleUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Parse the schedule object from the request body.
	schedule, err := lib.ParseScheduleFromRequest(c, *workspace)
	if err != nil {
		log.Printf("Error creating schedule object: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Create the schedule in the database.
	schedule, err = db.CreateSchedule(schedule)
	if err != nil {
		log.Printf("Error creating schedule: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Delete the current associated schedule object and its triggers.
	if workflow.Schedule != nil {
		db.DeleteSchedule(workflow.Schedule.ID)
	}

	// Update the workflow record with the new schedule object.
	updatedWorkflow, err := db.UpdateWorkflow(workflow.ID, map[string]any{
		"schedule_id": &schedule.ID,
	})
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow schedule updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("schedule_updated"),
		Data:    workflowResponse,
	})
}

func WorkflowsDestroy(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Delete the current associated workflowable object.
	if workflow.Action != nil {
		// Delete the action workflowable object.
		db.DeleteActionWorkflowable(workflow.Action.ID)
	}
	if workflow.Import != nil {
		// Delete the import workflowable object.
		db.DeleteImportWorkflowable(workflow.Import.ID)
	}
	if workflow.Export != nil {
		// Delete the export workflowable object.
		db.DeleteExportWorkflowable(workflow.Export.ID)
	}
	if workflow.Pipeline != nil {
		// Delete the pipeline workflowable object and its stages.
		db.DeletePipelineWorkflowable(workflow.Pipeline.ID)
	}

	// Delete the current associated schedule object and its triggers.
	if workflow.Schedule != nil {
		db.DeleteSchedule(workflow.Schedule.ID)
	}

	// Delete the workflow record.
	err := db.DeleteWorkflow(workflow.ID)
	if err != nil {
		log.Printf("Error deleting workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: "Workflow deleted",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("workflow_deleted"),
	})
}

func TransferWorkflowOwnership(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Decode the new owner ID.
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding new owner sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, err := db.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if err != nil {
		log.Printf("Error checking if user is in workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}

	// Update the workflow record.
	updatedWorkflow, err := db.UpdateWorkflow(workflow.ID, map[string]any{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Workflow ownership transferred to %s", updatedWorkflow.Owner.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("workflow_ownership_transferred"),
		Data:    workflowResponse,
	})
}

func PauseWorkflow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Update the workflow record to pause it.
	updatedWorkflow, err := db.UpdateWorkflow(workflow.ID, map[string]any{
		"paused": true,
	})
	if err != nil {
		log.Printf("Error pausing workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow paused",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("workflow_stopped"),
		Data:    workflowResponse,
	})
}

func StartWorkflow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Check if the workflow is already running.
	if !workflow.Paused {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("workflow_already_running")},
		})
	}

	// Update the workflow record to start it.
	updatedWorkflow, err := db.UpdateWorkflow(workflow.ID, map[string]any{
		"paused": false,
	})
	if err != nil {
		log.Printf("Error starting workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// TODO: Start the workflow execution.

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(*updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow started",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("workflow_started"),
		Data:    workflowResponse,
	})
}
