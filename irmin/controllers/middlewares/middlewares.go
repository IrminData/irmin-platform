package middlewares

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"
	"sync"

	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	irminvalidator "github.com/IrminData/irmin-sdk-go/validator"
)

type APIMiddlewares struct {
	DB                *db.Database
	Logger            *slog.Logger
	Env               *utils.CoreAPIEnv
	Orchestrator      *orchestrator.Orchestrator
	SQIDManager       *irminsqids.SQIDManager
	lm                *locales.LocaleManager
	permissionService *lib.PermissionService
	userMutex         sync.RWMutex // Protects user operations to prevent race conditions
	validator         *irminvalidator.Validator
	authCache         *AuthCache     // Cache for authentication results
	responseCache     *ResponseCache // Cache for API responses
}

func NewAPIMiddlewares(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *irminsqids.SQIDManager,
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
		validator:         irminvalidator.NewValidator(sqidManager),
		authCache:         &AuthCache{cache: make(map[string]*AuthCacheEntry)},
		responseCache:     &ResponseCache{cache: make(map[string]*ResponseCacheEntry)},
	}
}
