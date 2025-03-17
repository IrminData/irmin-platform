package controllers

import "github.com/gofiber/fiber/v3"

func ExportWorkflowsIndex(c fiber.Ctx) error {
	return c.SendString("Export Workflows Index")
}

func ExportWorkflowsStore(c fiber.Ctx) error {
	return c.SendString("Export Workflows Store")
}

func ExportWorkflowsUpdate(c fiber.Ctx) error {
	return c.SendString("Export Workflows Update")
}
