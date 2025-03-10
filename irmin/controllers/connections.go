package controllers

import "github.com/gofiber/fiber/v3"

func ConnectionDetails(c fiber.Ctx) error  { return c.SendString("Connection details") }
func TestConnection(c fiber.Ctx) error     { return c.SendString("Test connection") }
func ConnectionSettings(c fiber.Ctx) error { return c.SendString("Connection settings") }
func ConnectionsStore(c fiber.Ctx) error   { return c.SendString("Connections store") }
func ConnectionsUpdate(c fiber.Ctx) error  { return c.SendString("Connections update") }
func ConnectionsDestroy(c fiber.Ctx) error { return c.SendString("Connections destroy") }
func ConnectionsIndex(c fiber.Ctx) error   { return c.SendString("Connections index") }
func TransferConnectionOwnership(c fiber.Ctx) error {
	return c.SendString("Transfer connection ownership")
}
