package controllers

import "github.com/gofiber/fiber/v3"

func WorkflowsIndex(c fiber.Ctx) error {
	return c.SendString("Workflows Index")
}

func WorkflowsShow(c fiber.Ctx) error {
	return c.SendString("Workflows Show")
}

func WorkflowsUpdate(c fiber.Ctx) error {

	return c.SendString("Workflows Update")
}

func WorkflowsDestroy(c fiber.Ctx) error {
	return c.SendString("Workflows Destroy")
}

func TransferWorkflowOwnership(c fiber.Ctx) error {
	return c.SendString("Transfer Workflow Ownership")
}

func ExecuteWorkflow(c fiber.Ctx) error {
	return c.SendString("Execute Workflow")
}

func WorkflowRunsIndex(c fiber.Ctx) error {
	return c.SendString("Workflow Runs Index")
}
