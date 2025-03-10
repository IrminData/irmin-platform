package controllers

import "github.com/gofiber/fiber/v3"

func ObjectsIndex(c fiber.Ctx) error {
	return c.SendString("ObjectsIndex")
}

func ObjectsShow(c fiber.Ctx) error {
	return c.SendString("ObjectsShow")
}

func ObjectsStore(c fiber.Ctx) error {
	return c.SendString("ObjectsStore")
}

func ObjectsUpdate(c fiber.Ctx) error {
	return c.SendString("ObjectsUpdate")
}

func ObjectsDestroy(c fiber.Ctx) error {
	return c.SendString("ObjectsDestroy")
}

func ObjectsContent(c fiber.Ctx) error {
	return c.SendString("ObjectsContent")
}

func ObjectsHistory(c fiber.Ctx) error {
	return c.SendString("ObjectsHistory")
}

func ObjectsSchema(c fiber.Ctx) error {
	return c.SendString("ObjectsSchema")
}
