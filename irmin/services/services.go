package services

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
	"github.com/gofiber/fiber/v3"
)

type APIServices struct {
	DB                 *db.Database
	Logger             *slog.Logger
	Env                *utils.CoreAPIEnv
	Orchestrator       *orchestrator.Orchestrator
	SQIDManager        *irminsqids.SQIDManager
	LocaleManager      *locales.LocaleManager
	PermissionService  *lib.PermissionService
	Validator          *irminvalidator.Validator
	CacheStorage       fiber.Storage
	authCache          *AuthCache
	perUserLocks       *PerUserLockManager // Per-user locks for sync operations
	schemaCacheManager *lib.SchemaCacheManager
}

func NewAPIServices(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *irminsqids.SQIDManager,
	localeManager *locales.LocaleManager,
	permissionService *lib.PermissionService,
	cacheStorage fiber.Storage,
) *APIServices {
	authCache := &AuthCache{cache: make(map[string]*AuthCacheEntry)}
	perUserLocks := &PerUserLockManager{locks: make(map[string]*sync.Mutex)}
	schemaCacheManager := lib.NewSchemaCacheManager(env, logger, db)
	return &APIServices{
		DB:                 db,
		Logger:             logger,
		Env:                env,
		Orchestrator:       orchestrator,
		SQIDManager:        sqidManager,
		LocaleManager:      localeManager,
		PermissionService:  permissionService,
		Validator:          irminvalidator.NewValidator(sqidManager),
		CacheStorage:       cacheStorage,
		authCache:          authCache,
		perUserLocks:       perUserLocks,
		schemaCacheManager: schemaCacheManager,
	}
}
