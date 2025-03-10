package controllers

import "github.com/gofiber/fiber/v3"

func ImportWorkflowsIndex(c fiber.Ctx) error {
	return c.SendString("Import Workflows Index")
}

func ImportWorkflowsStore(c fiber.Ctx) error {
	return c.SendString("Import Workflows Store")
}
