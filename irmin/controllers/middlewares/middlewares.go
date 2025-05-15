package middlewares

import (
	"irmin-api/db"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"
)

type APIMiddlewares struct {
	DB           *db.Database
	Logger       *slog.Logger
	Env          *utils.CoreAPIEnv
	Orchestrator *orchestrator.Orchestrator
}

func NewAPIMiddlewares(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
) *APIMiddlewares {
	return &APIMiddlewares{
		DB:           db,
		Logger:       logger,
		Env:          env,
		Orchestrator: orchestrator,
	}
}
