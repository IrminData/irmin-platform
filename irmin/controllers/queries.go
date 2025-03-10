package controllers

import "github.com/gofiber/fiber/v3"

func QueriesIndex(c fiber.Ctx) error        { return c.SendString("Queries index") }
func QueriesShow(c fiber.Ctx) error         { return c.SendString("Queries show") }
func QueriesStore(c fiber.Ctx) error        { return c.SendString("Queries store") }
func QueriesUpdate(c fiber.Ctx) error       { return c.SendString("Queries update") }
func QueriesDestroy(c fiber.Ctx) error      { return c.SendString("Queries destroy") }
func ExecuteQuery(c fiber.Ctx) error        { return c.SendString("Execute query") }
func ExecuteAdhocQuery(c fiber.Ctx) error   { return c.SendString("Execute adhoc query") }
func QueryResultsShow(c fiber.Ctx) error    { return c.SendString("Query results show") }
func QueryResultsDestroy(c fiber.Ctx) error { return c.SendString("Query results destroy") }
