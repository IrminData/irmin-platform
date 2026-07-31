package models

import (
	"irmin-connectors/db"
	"irmin-connectors/listeners"
	"irmin-connectors/utils"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// ConnectorsApp holds all the application dependencies.
type ConnectorsApp struct {
	App             *fiber.App
	DB              *db.Database
	Env             *utils.ConnectorsEnv
	Logger          *slog.Logger
	ListenerManager *listeners.Manager

	// JobManager owns the lifecycle of async operation jobs (pull
	// today; push/patch later). Holds worker goroutines, progress
	// slices, and the janitor that GCs expired result zips.
	//
	// Typed as `any` here to avoid a dependency cycle between the
	// models package and connectors/common, where the concrete type
	// lives. Consumers type-assert to *common.JobManager at the
	// handler boundary.
	JobManager any
}
