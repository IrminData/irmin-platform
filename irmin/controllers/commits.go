package controllers

import "github.com/gofiber/fiber/v3"

func CommitsIndex(c fiber.Ctx) error {
	return c.SendString("Commits Index")
}

func CommitsStore(c fiber.Ctx) error {
	return c.SendString("Commits Store")
}

func CommitsShow(c fiber.Ctx) error {
	return c.SendString("Commits Show")
}

func RevertUncommittedChanges(c fiber.Ctx) error {
	return c.SendString("Revert Uncommitted Changes")
}

func ShowLastCommit(c fiber.Ctx) error {
	return c.SendString("Show Last Modification Commit")
}
