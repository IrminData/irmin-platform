package controllers

import "github.com/gofiber/fiber/v3"

func EditorItemsIndex(c fiber.Ctx) error  { return c.SendString("Editor items index") }
func EditorItemStore(c fiber.Ctx) error   { return c.SendString("Editor item files store") }
func EditorItemContent(c fiber.Ctx) error { return c.SendString("Editor item content") }
