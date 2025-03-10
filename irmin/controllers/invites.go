package controllers

import "github.com/gofiber/fiber/v3"

func InvitesIndex(c fiber.Ctx) error   { return c.SendString("Invites index") }
func InvitesStore(c fiber.Ctx) error   { return c.SendString("Invites store") }
func InvitesUpdate(c fiber.Ctx) error  { return c.SendString("Invites update") }
func InvitesDestroy(c fiber.Ctx) error { return c.SendString("Invites destroy") }
func ResendInvite(c fiber.Ctx) error   { return c.SendString("Resend invite") }
