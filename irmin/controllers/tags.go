package controllers

import "github.com/gofiber/fiber/v3"

func TagsIndex(c fiber.Ctx) error {
	return c.SendString("Tags Index")
}

func TagsStore(c fiber.Ctx) error {
	return c.SendString("Tags Store")
}

func TagsShow(c fiber.Ctx) error {
	return c.SendString("Tags Show")
}

func TagsDestroy(c fiber.Ctx) error {
	return c.SendString("Tags Destroy")
}
