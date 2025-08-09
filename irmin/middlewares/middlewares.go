package middlewares

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/services"
	"irmin-api/utils"
	"log/slog"

	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	irminvalidator "github.com/IrminData/irmin-sdk-go/validator"
)

type APIMiddlewares struct {
	DB                *db.Database
	Logger            *slog.Logger
	Env               *utils.CoreAPIEnv
	Orchestrator      *orchestrator.Orchestrator
	SQIDManager       *irminsqids.SQIDManager
	Services          *services.APIServices
	lm                *locales.LocaleManager
	permissionService *lib.PermissionService
	validator         *irminvalidator.Validator
}

func NewAPIMiddlewares(
	apiServices *services.APIServices,
) *APIMiddlewares {
	return &APIMiddlewares{
		DB:                apiServices.DB,
		Logger:            apiServices.Logger,
		Env:               apiServices.Env,
		Orchestrator:      apiServices.Orchestrator,
		SQIDManager:       apiServices.SQIDManager,
		Services:          apiServices,
		lm:                apiServices.LocaleManager,
		permissionService: apiServices.PermissionService,
		validator:         apiServices.Validator,
	}
}
