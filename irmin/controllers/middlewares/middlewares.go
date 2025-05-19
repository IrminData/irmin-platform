package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"
)

type APIMiddlewares struct {
	DB           *db.Database
	Logger       *slog.Logger
	Env          *utils.CoreAPIEnv
	Orchestrator *orchestrator.Orchestrator
	SQIDManager  *utils.SQIDManager
	lm           *locales.LocaleManager
}

func NewAPIMiddlewares(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *utils.SQIDManager,
	localeManager *locales.LocaleManager,
) *APIMiddlewares {
	return &APIMiddlewares{
		DB:           db,
		Logger:       logger,
		Env:          env,
		Orchestrator: orchestrator,
		SQIDManager:  sqidManager,
		lm:           localeManager,
	}
}
