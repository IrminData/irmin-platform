package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/permissions"
	"irmin-api/services"
	"irmin-api/utils"
	"log/slog"

	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
	irminvalidator "github.com/IrminData/irmin-platform/sdks/go/validator"
	"github.com/gofiber/fiber/v3"
)

type APIMiddlewares struct {
	DB                *db.Database
	Logger            *slog.Logger
	Env               *utils.CoreAPIEnv
	Orchestrator      *orchestrator.Orchestrator
	SQIDManager       *irminsqids.SQIDManager
	Services          *services.APIServices
	lm                *locales.LocaleManager
	permissionService *permissions.Service
	validator         *irminvalidator.Validator
	errorHandler      *services.ErrorHandler
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
		errorHandler:      services.NewErrorHandler(apiServices.Logger, apiServices.LocaleManager),
	}
}

// handleServiceError handles errors from the service layer with proper translation and logging.
// It checks if the error is internal-only and either exposes it to the client or returns a generic error.
func (api *APIMiddlewares) handleServiceError(
	c fiber.Ctx,
	consoleLogPrefix string,
	err error,
	dict locales.Dictionary,
) error {
	return api.errorHandler.HandleServiceError(c, consoleLogPrefix, err, dict)
}
