package controllers

import (
	"irmin-api/db"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"
)

type APIControllers struct {
	DB           *db.Database
	Logger       *slog.Logger
	Env          *utils.CoreAPIEnv
	Orchestrator *orchestrator.Orchestrator
}

func NewAPIControllers(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
) *APIControllers {
	return &APIControllers{
		DB:           db,
		Logger:       logger,
		Env:          env,
		Orchestrator: orchestrator,
	}
}
