package controllers

import "github.com/gofiber/fiber/v3"

func CredentialsIndex(c fiber.Ctx) error {
	return c.SendString("Credentials Index")
}

func CredentialsStore(c fiber.Ctx) error {
	return c.SendString("Credentials Store")
}

func CredentialsDestroy(c fiber.Ctx) error {
	return c.SendString("Credentials Destroy")
}
