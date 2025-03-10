package controllers

import "github.com/gofiber/fiber/v3"

func RepositoriesIndex(c fiber.Ctx) error   { return c.SendString("Repositories index") }
func RepositoriesStore(c fiber.Ctx) error   { return c.SendString("Repositories store") }
func RepositoriesShow(c fiber.Ctx) error    { return c.SendString("Repositories show") }
func RepositoriesDestroy(c fiber.Ctx) error { return c.SendString("Repositories destroy") }
func RepositoriesUpdate(c fiber.Ctx) error  { return c.SendString("Repositories update") }
func TransferRepositoryOwnership(c fiber.Ctx) error {
	return c.SendString("Transfer repository ownership")
}
func DownloadRepository(c fiber.Ctx) error {
	return c.SendString("Download repository")
}
