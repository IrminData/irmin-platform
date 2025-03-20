package controllers

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"github.com/gofiber/fiber/v3"
)

func TriggerWorkflowRun(c fiber.Ctx) error {
	// Get the dictionary, workflow and the user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)
	user := c.Locals("user").(*db.User)

	// Create a new workflow run.
	run := &db.WorkflowRun{
		Status:            db.WorkflowStatusPending,
		TriggeredByUserID: &user.ID,
		WorkflowID:        workflow.ID,
	}

	// Save the workflow run to the database.
	_, err := db.CreateWorkflowRun(run)
	if err != nil {
		log.Printf("error creating workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Message: dict.T("error_occured"),
		})
	}

	// TODO: Execute the workflow run.

	// Fetch the newly created workflow run.
	createdRun, err := db.GetWorkflowRunByID(run.ID)
	if err != nil {
		log.Printf("error fetching created workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Message: dict.T("error_occured"),
		})
	}

	// Format the workflow run for the response.
	formattedRun, err := lib.FormatWorkflowRunResponse(createdRun)
	if err != nil {
		log.Printf("error formatting workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Message: dict.T("error_occured"),
		})
	}

	// Return the formatted workflow run.
	return utils.WriteResponse(c, fiber.StatusCreated, utils.IrminAPIResponse{
		Data: formattedRun,
	})
}

func WorkflowRunsIndex(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workflow := c.Locals("workflow").(*db.Workflow)

	// Get the workflow runs for the workflow.
	runs, err := db.GetWorkflowRunsByWorkflowID(workflow.ID)
	if err != nil {
		log.Printf("error getting workflow runs: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Message: dict.T("error_occured"),
		})
	}

	// Format the workflow runs for the response.
	var response []db.WorkflowRunResponse
	for _, run := range runs {
		formattedRun, err := lib.FormatWorkflowRunResponse(&run)
		if err != nil {
			log.Printf("error formatting workflow run: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Message: dict.T("error_occured"),
			})
		}
		response = append(response, *formattedRun)
	}

	// Return the formatted workflow runs.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Decode the workflow run ID.
	workflowRunID, err := utils.DecodeSqids("workflow-runs", runSqid)
	if err != nil {
		log.Printf("Error decoding invite sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Find the workflow run by its ID.
	workflowRun, err := db.GetWorkflowRunByID(uint(workflowRunID))
	if err != nil {
		log.Printf("Error retrieving workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Make sure the workflow run belongs to the workflow.
	if workflowRun.WorkflowID != workflow.ID {
		log.Printf("Workflow run does not belong to workflow")
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Format the workflow run for the response.
	formattedRun, err := lib.FormatWorkflowRunResponse(workflowRun)
	if err != nil {
		log.Printf("Error formatting workflow run: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Message: dict.T("error_occured"),
		})
	}

	// Return the formatted workflow run.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: formattedRun,
	})
}
