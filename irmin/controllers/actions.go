package controllers

import "github.com/gofiber/fiber/v3"

func ActionWorkflowsIndex(c fiber.Ctx) error {
	return c.SendString("Action Workflows Index")
}

func ActionWorkflowsStore(c fiber.Ctx) error {
	return c.SendString("Action Workflows Store")
}
