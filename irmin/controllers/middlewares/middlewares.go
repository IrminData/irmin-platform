package middlewares

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"
)

type APIMiddlewares struct {
	DB                *db.Database
	Logger            *slog.Logger
	Env               *utils.CoreAPIEnv
	Orchestrator      *orchestrator.Orchestrator
	SQIDManager       *utils.SQIDManager
	lm                *locales.LocaleManager
	permissionService *lib.PermissionService
}

func NewAPIMiddlewares(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *utils.SQIDManager,
	localeManager *locales.LocaleManager,
	permissionService *lib.PermissionService,
) *APIMiddlewares {
	return &APIMiddlewares{
		DB:                db,
		Logger:            logger,
		Env:               env,
		Orchestrator:      orchestrator,
		SQIDManager:       sqidManager,
		lm:                localeManager,
		permissionService: permissionService,
	}
}
