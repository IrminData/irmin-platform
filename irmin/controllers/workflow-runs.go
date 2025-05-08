package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"math"
	"strconv"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func TriggerWorkflowRun(c fiber.Ctx) error {
	// Get the dictionary, workflow and the user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the request context.
	ctx := c.Context()

	// Execute the workflow.
	run, err := lib.ExecuteWorkflow(ctx, *workflow, user, nil)
	if err != nil {
		log.Printf("error executing workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: dict.T("error_occurred"),
		})
	}

	// Format the workflow run for the response.
	formattedRun, err := formatter.FormatWorkflowRunResponse(run)
	if err != nil {
		log.Printf("error formatting workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: dict.T("error_occurred"),
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Workflow run %s created", formattedRun.ID),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the formatted workflow run.
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}

func WorkflowRunsIndex(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Get the query parameters from the request.
	params, err := utils.ParseQueryParams(c, nil, []string{
		"page",
		"per_page",
	})
	if err != nil {
		log.Printf("Error parsing query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Determine the pagination parameters
	per_page := 100
	page := 1
	if params["per_page"] != "" {
		parsedPerPage, err := strconv.Atoi(params["per_page"])
		if err == nil {
			per_page = parsedPerPage
		}
	}
	if params["page"] != "" {
		parsedPage, err := strconv.Atoi(params["page"])
		if err == nil {
			page = parsedPage
		}
	}
	offset := (page - 1) * per_page

	// Get the workflow runs for the workflow.
	runs, count, err := db.GetWorkflowRunsByWorkflowID(workflow.ID, per_page, offset)
	if err != nil {
		log.Printf("error getting workflow runs: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: dict.T("error_occurred"),
		})
	}

	// Format the workflow runs for the response.
	var response []irminmodels.WorkflowRun
	for _, run := range runs {
		formattedRun, err := formatter.FormatWorkflowRunResponse(&run)
		if err != nil {
			log.Printf("error formatting workflow run: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Message: dict.T("error_occurred"),
			})
		}
		response = append(response, *formattedRun)
	}

	// Return the formatted workflow runs.
	totalPages := int(math.Ceil(float64(count) / float64(per_page)))
	hasMore := page < totalPages
	var nextPage *string
	if hasMore {
		nextPageStr := strconv.Itoa(page + 1)
		nextPage = &nextPageStr
	}
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Pagination: &irminmodels.IrminAPIPaginationMetadata{
			Total:      int(count),
			TotalPages: totalPages,
			Page:       &page,
			PerPage:    per_page,
			HasMore:    hasMore,
			Next:       nextPage,
		},
		Data: response,
	})
}

func WorkflowRunsShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Parse the run sqid from the request URL.
	runSqid := c.Params("run")
	if runSqid == "" {
		log.Printf("No workflow run selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the workflow run ID.
	workflowRunID, err := utils.DecodeSqids("workflow-runs", runSqid)
	if err != nil {
		log.Printf("Error decoding invite sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the workflow run by its ID.
	workflowRun, err := db.GetWorkflowRunByID(uint(workflowRunID))
	if err != nil {
		log.Printf("Error retrieving workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Make sure the workflow run belongs to the workflow.
	if workflowRun.WorkflowID != workflow.ID {
		log.Printf("Workflow run does not belong to workflow")
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the workflow run for the response.
	formattedRun, err := formatter.FormatWorkflowRunResponse(workflowRun)
	if err != nil {
		log.Printf("Error formatting workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: dict.T("error_occurred"),
		})
	}

	// Return the formatted workflow run.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}

func WorkflowRunsDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Parse the run sqid from the request URL.
	runSqid := c.Params("run")
	if runSqid == "" {
		log.Printf("No workflow run selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the workflow run ID.
	workflowRunID, err := utils.DecodeSqids("workflow-runs", runSqid)
	if err != nil {
		log.Printf("Error decoding workflow run sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the workflow run by its ID.
	workflowRun, err := db.GetWorkflowRunByID(uint(workflowRunID))
	if err != nil {
		log.Printf("Error retrieving workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Make sure the workflow run belongs to the workflow.
	if workflowRun.WorkflowID != workflow.ID {
		log.Printf("Workflow run does not belong to workflow")
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// TODO: Cancel the workflow run and stop all running tasks.

	// Change the workflow run status to cancelled.
	workflowRun.Status = db.WorkflowStatusCancelled
	finishedAt := time.Now()
	workflowRun.FinishedAt = &finishedAt
	workflowRun.Logs = append(workflowRun.Logs, "Workflow run cancelled")
	workflowRun.Status = db.WorkflowStatusCancelled
	workflowRun, err = db.UpdateWorkflowRun(workflowRun)
	if err != nil {
		log.Printf("Error cancelling workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: dict.T("error_occurred"),
		})
	}

	// Format the workflow run for the response.
	formattedRun, err := formatter.FormatWorkflowRunResponse(workflowRun)
	if err != nil {
		log.Printf("Error formatting workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: dict.T("error_occurred"),
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeWarning,
		Description: fmt.Sprintf("Workflow run %s cancelled", formattedRun.ID),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the formatted workflow run.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}
