package controllers

import "github.com/gofiber/fiber/v3"

func WorkspacesIndex(c fiber.Ctx) error   { return c.SendString("Workspaces index") }
func WorkspacesStore(c fiber.Ctx) error   { return c.SendString("Workspaces store") }
func WorkspacesShow(c fiber.Ctx) error    { return c.SendString("Workspaces show") }
func WorkspacesUpdate(c fiber.Ctx) error  { return c.SendString("Workspaces update") }
func WorkspacesDestroy(c fiber.Ctx) error { return c.SendString("Workspaces destroy") }
func SwitchWorkspace(c fiber.Ctx) error   { return c.SendString("Switch workspace") }
func TransferWorkspaceOwnership(c fiber.Ctx) error {
	return c.SendString("Transfer workspace ownership")
}
func LeaveWorkspace(c fiber.Ctx) error { return c.SendString("Leave workspace") }
