package controllers

import "github.com/gofiber/fiber/v3"

func PipelineWorkflowsIndex(c fiber.Ctx) error {
	return c.SendString("Pipeline Workflows Index")
}

func PipelineWorkflowsStore(c fiber.Ctx) error {
	return c.SendString("Pipeline Workflows Store")
}
