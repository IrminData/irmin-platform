package controllers

import "github.com/gofiber/fiber/v3"

func Index(c fiber.Ctx) error {
	return c.SendString("Hello, world!")
}

func Health(c fiber.Ctx) error {
	return c.SendString("OK")
}
