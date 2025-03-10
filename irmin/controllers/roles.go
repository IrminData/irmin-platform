package controllers

import "github.com/gofiber/fiber/v3"

func RolesIndex(c fiber.Ctx) error { return c.SendString("Roles index") }
