package controllers

import (
	"github.com/gofiber/fiber/v3"
)

func WorkflowRunsStore(c fiber.Ctx) error {
	return c.SendString("Execute Workflow")
}

func WorkflowRunsIndex(c fiber.Ctx) error {
	return c.SendString("Workflow Runs Index")
}

func WorkflowRunsShow(c fiber.Ctx) error {
	return c.SendString("Workflow Runs Show")
}
