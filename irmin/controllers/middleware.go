package controllers

import "github.com/gofiber/fiber/v3"

func APIMiddleware(c fiber.Ctx) error {
	return c.Next()
}
