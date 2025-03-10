package controllers

import "github.com/gofiber/fiber/v3"

func ConnectorsIndex(c fiber.Ctx) error { return c.SendString("Connectors index") }
func ConnectorsShow(c fiber.Ctx) error  { return c.SendString("Connectors show") }
