package models

import (
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// ConnectorsApp holds all the application dependencies.
type ConnectorsApp struct {
	App    *fiber.App
	DB     *db.Database
	Env    *utils.ConnectorsEnv
	Logger *slog.Logger
}
