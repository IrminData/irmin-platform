package controllers

import "github.com/gofiber/fiber/v3"

func (api *APIControllers) Index(c fiber.Ctx) error {
	return c.SendString("Hello, world!")
}

func (api *APIControllers) Health(c fiber.Ctx) error {
	return c.SendString("OK")
}
