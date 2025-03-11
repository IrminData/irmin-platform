package controllers

import "github.com/gofiber/fiber/v3"

func ConnectorsIndex(c fiber.Ctx) error   { return c.SendString("Connectors index") }
func ConnectorsStore(c fiber.Ctx) error   { return c.SendString("Connectors store") }
func ConnectorsUpdate(c fiber.Ctx) error  { return c.SendString("Connectors update") }
func ConnectorsDestroy(c fiber.Ctx) error { return c.SendString("Connectors destroy") }
func ConnectorsShow(c fiber.Ctx) error    { return c.SendString("Connectors show") }
