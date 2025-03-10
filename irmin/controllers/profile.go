package controllers

import "github.com/gofiber/fiber/v3"

func ProfileShow(c fiber.Ctx) error   { return c.SendString("Profile show") }
func ProfileUpdate(c fiber.Ctx) error { return c.SendString("Profile update") }
