package controllers

import "github.com/gofiber/fiber/v3"

func UsersIndex(c fiber.Ctx) error   { return c.SendString("Users index") }
func UsersShow(c fiber.Ctx) error    { return c.SendString("Users show") }
func UsersDestroy(c fiber.Ctx) error { return c.SendString("Users destroy") }
func UsersUpdate(c fiber.Ctx) error  { return c.SendString("Users update") }
