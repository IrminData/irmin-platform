package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

func (api *APIControllers) WorkflowsIndex(c fiber.Ctx) error {
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
		workflows, err = api.DB.GetWorkflowsOfTypeByWorkspaceID(workspace.ID, db.WorkflowableType(query["type"]))
		if err != nil {
			log.Printf("Error retrieving workflows: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else {
		// Get the workflows for the workspace.
		workflows, err = api.DB.GetWorkflowsByWorkspaceID(workspace.ID)
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
		workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, &workflow)
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

func (api *APIControllers) WorkflowsShow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, workflow)
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

func (api *APIControllers) WorkflowsUpdate(c fiber.Ctx) error {
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
	workflow.Name = fields["name"]
	workflow.Description = fields["description"]
	workflow.Documentation = fields["documentation"]
	updatedWorkflow, err := api.DB.UpdateWorkflow(workflow)
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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

func (api *APIControllers) WorkflowsStore(c fiber.Ctx) error {
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
	var workflow db.Workflow

	// Start a transaction for all database operations
	err = api.DB.Transaction(func(tx *gorm.DB) error {
		// Proceed based on the workflow type.
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
				return err
			}
			// Find the repository by slug.
			repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
			if err != nil {
				return err
			}
			// Find the connection by ID.
			connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
			if err != nil {
				return err
			}
			connection, err := api.DB.GetConnectionByID(uint(connectionID))
			if err != nil {
				return err
			}

			// Trim only leading slash from the path and the connection path.
			path := strings.TrimLeft(workflowableFields["path"], "/")
			connectionPath := strings.TrimLeft(workflowableFields["connection_path"], "/")

			// Create the workflowable in the database.
			importWorkflowable = &db.ImportWorkflowable{
				ConnectionID:   connection.ID,
				ConnectionPath: connectionPath,
				RepositoryID:   repository.ID,
				Branch:         workflowableFields["branch"],
				Path:           path,
			}
			if err := tx.Create(importWorkflowable).Error; err != nil {
				return err
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
				return err
			}
			repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
			if err != nil {
				return err
			}
			connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
			if err != nil {
				return err
			}
			connection, err := api.DB.GetConnectionByID(uint(connectionID))
			if err != nil {
				return err
			}

			path := strings.TrimLeft(workflowableFields["path"], "/")
			connectionPath := strings.TrimLeft(workflowableFields["connection_path"], "/")

			exportWorkflowable = &db.ExportWorkflowable{
				ConnectionID:   connection.ID,
				ConnectionPath: connectionPath,
				RepositoryID:   repository.ID,
				Branch:         workflowableFields["branch"],
				Path:           path,
			}
			if err := tx.Create(exportWorkflowable).Error; err != nil {
				return err
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
				return err
			}

			inputObjects, err := utils.ParseArrayFormFields(c, "input")
			if err != nil {
				return err
			}

			var inputData []db.ActionWorkflowableInput
			for _, inputObject := range inputObjects {
				repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(inputObject["repository"], workspace.ID)
				if err != nil {
					return err
				}

				path := strings.Trim(inputObject["path"], "/")
				inputData = append(inputData, db.ActionWorkflowableInput{
					RepositoryID: repository.ID,
					Ref:          inputObject["ref"],
					Path:         path,
				})
			}

			var repository *db.Repository
			if workflowableFields["repository"] != "" {
				repository, err = api.DB.GetRepositoryBySlugAndWorkspaceID(
					workflowableFields["repository"],
					workspace.ID,
				)
				if err != nil {
					return err
				}
			}

			var workflowable db.ActionWorkflowable
			if repository != nil {
				repositoryID := repository.ID
				branch := workflowableFields["branch"]
				path := strings.Trim(workflowableFields["path"], "/") + "/"

				workflowable = db.ActionWorkflowable{
					Executable:   workflowableFields["executable"],
					RepositoryID: &repositoryID,
					Branch:       &branch,
					Path:         &path,
					Inputs:       inputData,
				}
			} else {
				workflowable = db.ActionWorkflowable{
					Executable: workflowableFields["executable"],
				}
			}
			if err := tx.Create(&workflowable).Error; err != nil {
				return err
			}
			actionWorkflowable = &workflowable
		case db.WorkflowableTypePipeline:
			// Create the pipeline workflowable object.
			// Parse additional request body fields
			workflowableFields, err := utils.ParseFormFields(c, nil, []string{"live"})
			if err != nil {
				return err
			}
			requestStages, err := utils.ParseArrayFormFields(c, "stage")
			if err != nil {
				return err
			}

			var stages []db.PipelineStage
			for orderSequence, stage := range requestStages {
				newStage := db.PipelineStage{
					OrderSequence: orderSequence,
					Description:   stage["description"],
					Write:         stage["write"] == "true",
					Read:          stage["read"] == "true",
				}
				switch stage["type"] {
				case "action":
					newStage.Type = db.PipelineStageTypeAction
					executable := strings.Trim(stage["executable"], "/")
					newStage.Executable = &executable
				case "connection":
					newStage.Type = db.PipelineStageTypeConnection
					parsedConnID, err := utils.DecodeSqids("connections", stage["connection"])
					if err != nil {
						return err
					}
					connection, err := api.DB.GetConnectionByID(uint(parsedConnID))
					if err != nil {
						return err
					}
					writePath := strings.TrimLeft(stage["connection_write_path"], "/")
					readPath := strings.TrimLeft(stage["connection_read_path"], "/")
					newStage.ConnectionID = &connection.ID
					newStage.ConnectionWritePath = &writePath
					newStage.ConnectionReadPath = &readPath
				case "repository":
					newStage.Type = db.PipelineStageTypeRepository
					repositorySlug := stage["repository"]
					repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
					if err != nil {
						return err
					}
					branch := stage["branch"]
					path := strings.TrimLeft(stage["path"], "/")
					newStage.RepositoryID = &repository.ID
					newStage.RepositoryBranch = &branch
					newStage.RepositoryPath = &path
				default:
					return fmt.Errorf("invalid stage type: %s", stage["type"])
				}
				stages = append(stages, newStage)
			}

			live := false
			if workflowableFields["live"] == "true" {
				live = true
			}
			pipelineWorkflowable = &db.PipelineWorkflowable{
				Live:   live,
				Stages: stages,
			}
			if err := tx.Create(pipelineWorkflowable).Error; err != nil {
				return err
			}
		default:
			return fmt.Errorf("invalid workflow type: %s", fields["type"])
		}

		// Parse the schedule object from the request body.
		schedule, err := lib.ParseScheduleFromRequest(c, api.DB, *workspace)
		if err != nil {
			return err
		}

		// Create the schedule in the database.
		if err := tx.Create(schedule).Error; err != nil {
			return err
		}

		// Create the workflow in the database.
		if importWorkflowable != nil {
			workflow = db.Workflow{
				Name:          fields["name"],
				Description:   fields["description"],
				Documentation: fields["documentation"],
				Type:          db.WorkflowableTypeImport,
				OwnerID:       user.ID,
				WorkspaceID:   workspace.ID,
				ScheduleID:    &schedule.ID,
				ImportID:      &importWorkflowable.ID,
			}
		} else if exportWorkflowable != nil {
			workflow = db.Workflow{
				Name:          fields["name"],
				Description:   fields["description"],
				Documentation: fields["documentation"],
				Type:          db.WorkflowableTypeExport,
				OwnerID:       user.ID,
				WorkspaceID:   workspace.ID,
				ScheduleID:    &schedule.ID,
				ExportID:      &exportWorkflowable.ID,
			}
		} else if actionWorkflowable != nil {
			workflow = db.Workflow{
				Name:          fields["name"],
				Description:   fields["description"],
				Documentation: fields["documentation"],
				Type:          db.WorkflowableTypeAction,
				OwnerID:       user.ID,
				WorkspaceID:   workspace.ID,
				ScheduleID:    &schedule.ID,
				ActionID:      &actionWorkflowable.ID,
			}
		} else if pipelineWorkflowable != nil {
			workflow = db.Workflow{
				Name:          fields["name"],
				Description:   fields["description"],
				Documentation: fields["documentation"],
				Type:          db.WorkflowableTypePipeline,
				OwnerID:       user.ID,
				WorkspaceID:   workspace.ID,
				ScheduleID:    &schedule.ID,
				PipelineID:    &pipelineWorkflowable.ID,
			}
		}

		if err := tx.Create(&workflow).Error; err != nil {
			return err
		}

		// Fetch the full workflow object with all relations
		if err := tx.Preload("Owner").Preload("Schedule").Preload("Import").Preload("Export").Preload("Action").Preload("Pipeline").First(&workflow, workflow.ID).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		log.Printf("Error creating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, &workflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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

func (api *APIControllers) WorkflowableUpdate(c fiber.Ctx) error {
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

	// Start a transaction for all database operations
	err := api.DB.Transaction(func(tx *gorm.DB) error {
		// Proceed based on the workflow type.
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
				return err
			}
			// Find the repository by slug.
			repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
			if err != nil {
				return err
			}
			// Find the connection by ID.
			connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
			if err != nil {
				return err
			}
			connection, err := api.DB.GetConnectionByID(uint(connectionID))
			if err != nil {
				return err
			}

			// Trim only leading slash from the path and the connection path.
			path := strings.TrimLeft(workflowableFields["path"], "/")
			connectionPath := strings.TrimLeft(workflowableFields["connection_path"], "/")

			// Create the workflowable in the database.
			importWorkflowable = &db.ImportWorkflowable{
				ConnectionID:   connection.ID,
				ConnectionPath: connectionPath,
				RepositoryID:   repository.ID,
				Branch:         workflowableFields["branch"],
				Path:           path,
			}
			if err := tx.Create(importWorkflowable).Error; err != nil {
				return err
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
				return err
			}
			repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(workflowableFields["repository"], workspace.ID)
			if err != nil {
				return err
			}
			connectionID, err := utils.DecodeSqids("connections", workflowableFields["connection"])
			if err != nil {
				return err
			}
			connection, err := api.DB.GetConnectionByID(uint(connectionID))
			if err != nil {
				return err
			}

			path := strings.TrimLeft(workflowableFields["path"], "/")
			connectionPath := strings.TrimLeft(workflowableFields["connection_path"], "/")

			exportWorkflowable = &db.ExportWorkflowable{
				ConnectionID:   connection.ID,
				ConnectionPath: connectionPath,
				RepositoryID:   repository.ID,
				Branch:         workflowableFields["branch"],
				Path:           path,
			}
			if err := tx.Create(exportWorkflowable).Error; err != nil {
				return err
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
				return err
			}

			inputObjects, err := utils.ParseArrayFormFields(c, "input")
			if err != nil {
				return err
			}

			var inputData []db.ActionWorkflowableInput
			for _, inputObject := range inputObjects {
				repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(inputObject["repository"], workspace.ID)
				if err != nil {
					return err
				}

				path := strings.Trim(inputObject["path"], "/")
				inputData = append(inputData, db.ActionWorkflowableInput{
					RepositoryID: repository.ID,
					Ref:          inputObject["ref"],
					Path:         path,
				})
			}

			var repository *db.Repository
			if workflowableFields["repository"] != "" {
				repository, err = api.DB.GetRepositoryBySlugAndWorkspaceID(
					workflowableFields["repository"],
					workspace.ID,
				)
				if err != nil {
					return err
				}
			}

			var workflowable db.ActionWorkflowable
			if repository != nil {
				repositoryID := repository.ID
				branch := workflowableFields["branch"]
				path := strings.Trim(workflowableFields["path"], "/") + "/"

				workflowable = db.ActionWorkflowable{
					Executable:   workflowableFields["executable"],
					RepositoryID: &repositoryID,
					Branch:       &branch,
					Path:         &path,
					Inputs:       inputData,
				}
			} else {
				workflowable = db.ActionWorkflowable{
					Executable: workflowableFields["executable"],
				}
			}
			if err := tx.Create(&workflowable).Error; err != nil {
				return err
			}
			actionWorkflowable = &workflowable
		case db.WorkflowableTypePipeline:
			// Create the pipeline workflowable object.
			// Parse additional request body fields
			workflowableFields, err := utils.ParseFormFields(c, nil, []string{"live"})
			if err != nil {
				return err
			}
			requestStages, err := utils.ParseArrayFormFields(c, "stage")
			if err != nil {
				return err
			}

			var stages []db.PipelineStage
			for orderSequence, stage := range requestStages {
				newStage := db.PipelineStage{
					OrderSequence: orderSequence,
					Description:   stage["description"],
					Write:         stage["write"] == "true",
					Read:          stage["read"] == "true",
				}
				switch stage["type"] {
				case "action":
					newStage.Type = db.PipelineStageTypeAction
					executable := strings.Trim(stage["executable"], "/")
					newStage.Executable = &executable
				case "connection":
					newStage.Type = db.PipelineStageTypeConnection
					parsedConnID, err := utils.DecodeSqids("connections", stage["connection"])
					if err != nil {
						return err
					}
					connection, err := api.DB.GetConnectionByID(uint(parsedConnID))
					if err != nil {
						return err
					}
					writePath := strings.TrimLeft(stage["connection_write_path"], "/")
					readPath := strings.TrimLeft(stage["connection_read_path"], "/")
					newStage.ConnectionID = &connection.ID
					newStage.ConnectionWritePath = &writePath
					newStage.ConnectionReadPath = &readPath
				case "repository":
					newStage.Type = db.PipelineStageTypeRepository
					repositorySlug := stage["repository"]
					repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
					if err != nil {
						return err
					}
					branch := stage["branch"]
					path := strings.TrimLeft(stage["path"], "/")
					newStage.RepositoryID = &repository.ID
					newStage.RepositoryBranch = &branch
					newStage.RepositoryPath = &path
				default:
					return fmt.Errorf("invalid stage type: %s", stage["type"])
				}
				stages = append(stages, newStage)
			}

			live := false
			if workflowableFields["live"] == "true" {
				live = true
			}
			pipelineWorkflowable = &db.PipelineWorkflowable{
				Live:   live,
				Stages: stages,
			}
			if err := tx.Create(pipelineWorkflowable).Error; err != nil {
				return err
			}
		default:
			return fmt.Errorf("invalid workflow type: %s", workflow.Type)
		}

		// Delete the current associated workflowable object.
		if workflow.Action != nil {
			// Delete the action workflowable object.
			if err := tx.Delete(&db.ActionWorkflowable{}, workflow.Action.ID).Error; err != nil {
				return err
			}
		}
		if workflow.Import != nil {
			// Delete the import workflowable object.
			if err := tx.Delete(&db.ImportWorkflowable{}, workflow.Import.ID).Error; err != nil {
				return err
			}
		}
		if workflow.Export != nil {
			// Delete the export workflowable object.
			if err := tx.Delete(&db.ExportWorkflowable{}, workflow.Export.ID).Error; err != nil {
				return err
			}
		}
		if workflow.Pipeline != nil {
			// Delete the pipeline workflowable object and its stages.
			if err := tx.Delete(&db.PipelineWorkflowable{}, workflow.Pipeline.ID).Error; err != nil {
				return err
			}
		}

		// Update the workflow record with the new workflowable object.
		if importWorkflowable != nil {
			workflow.ImportID = &importWorkflowable.ID
		} else if exportWorkflowable != nil {
			workflow.ExportID = &exportWorkflowable.ID
		} else if actionWorkflowable != nil {
			workflow.ActionID = &actionWorkflowable.ID
		} else if pipelineWorkflowable != nil {
			workflow.PipelineID = &pipelineWorkflowable.ID
		}

		if err := tx.Save(workflow).Error; err != nil {
			return err
		}

		// Fetch the full workflow object with all relations
		if err := tx.Preload("Owner").Preload("Schedule").Preload("Import").Preload("Export").Preload("Action").Preload("Pipeline").First(workflow, workflow.ID).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, workflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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

func (api *APIControllers) ScheduleUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Parse the schedule object from the request body.
	schedule, err := lib.ParseScheduleFromRequest(c, api.DB, *workspace)
	if err != nil {
		log.Printf("Error creating schedule object: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Start a transaction.
	err = api.DB.Transaction(func(tx *gorm.DB) error {
		newSchedule := schedule
		// Create the schedule in the database.
		err = tx.Create(&newSchedule).Error
		if err != nil {
			log.Printf("Error creating schedule: %v", err)
			return err
		}

		// Delete the current associated schedule object and its triggers.
		if workflow.ScheduleID != nil {
			err := tx.Where("schedule_id = ?", workflow.ScheduleID).Delete(&db.WorkflowTrigger{}).Error
			if err != nil {
				log.Printf("Error deleting schedule triggers: %v", err)
				return err
			}
			err = tx.Delete(&db.Schedule{}, workflow.ScheduleID).Error
			if err != nil {
				log.Printf("Error deleting schedule: %v", err)
				return err
			}
		}

		// Update the workflow record with the new schedule object.
		workflow.ScheduleID = &newSchedule.ID
		workflow.Schedule = newSchedule
		err = tx.Save(workflow).Error
		if err != nil {
			log.Printf("Error updating workflow: %v", err)
			return err
		}

		return nil
	})
	if err != nil {
		log.Printf("Error updating workflow schedule: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, workflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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

func (api *APIControllers) WorkflowsDestroy(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Delete the workflow and all related records
	err := api.DB.DeleteWorkflow(workflow.ID)
	if err != nil {
		log.Printf("Error deleting workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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

func (api *APIControllers) TransferWorkflowOwnership(c fiber.Ctx) error {
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
	inWorkspace, err := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
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
	workflow.OwnerID = uint(newOwnerID)
	updatedWorkflow, err := api.DB.UpdateWorkflow(workflow)
	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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

func (api *APIControllers) PauseWorkflow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Update the workflow record to pause it.
	workflow.Paused = true
	updatedWorkflow, err := api.DB.UpdateWorkflow(workflow)
	if err != nil {
		log.Printf("Error pausing workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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

func (api *APIControllers) StartWorkflow(c fiber.Ctx) error {
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
	workflow.Paused = false
	updatedWorkflow, err := api.DB.UpdateWorkflow(workflow)
	if err != nil {
		log.Printf("Error starting workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, updatedWorkflow)
	if err != nil {
		log.Printf("Error getting workflow response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, &db.LogEvent{
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
