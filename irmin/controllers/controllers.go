package controllers

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"
)

type APIControllers struct {
	DB                *db.Database
	Logger            *slog.Logger
	Env               *utils.CoreAPIEnv
	Orchestrator      *orchestrator.Orchestrator
	SQIDManager       *utils.SQIDManager
	lm                *locales.LocaleManager
	permissionService *lib.PermissionService
}

func NewAPIControllers(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *utils.SQIDManager,
	localeManager *locales.LocaleManager,
	permissionService *lib.PermissionService,
) *APIControllers {
	return &APIControllers{
		DB:                db,
		Logger:            logger,
		Env:               env,
		Orchestrator:      orchestrator,
		SQIDManager:       sqidManager,
		lm:                localeManager,
		permissionService: permissionService,
	}
}
