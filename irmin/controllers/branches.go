package controllers

import "github.com/gofiber/fiber/v3"

func BranchesIndex(c fiber.Ctx) error {
	return c.SendString("Branches Index")
}

func BranchesStore(c fiber.Ctx) error {
	return c.SendString("Branches Store")
}

func BranchesShow(c fiber.Ctx) error {
	return c.SendString("Branches Show")
}

func BranchesUpdate(c fiber.Ctx) error {
	return c.SendString("Branches Update")
}

func BranchesDestroy(c fiber.Ctx) error {
	return c.SendString("Branches Destroy")
}
