package controllers

import "github.com/gofiber/fiber/v3"

func CompareRefs(c fiber.Ctx) error {
	return c.SendString("CompareRefs")
}
func MergeRefs(c fiber.Ctx) error {
	return c.SendString("MergeRefs")
}
