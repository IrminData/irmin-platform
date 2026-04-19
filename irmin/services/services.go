package services

import (
	"context"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/permissions"
	"irmin-api/services/oauth"
	"irmin-api/utils"
	"log/slog"

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
	PermissionService  *permissions.Service
	Validator          *irminvalidator.Validator
	CacheStorage       fiber.Storage
	BillingService     *BillingService
	UsageTracker       *UsageTracker
	OAuthService       *oauth.Service
	authCache          *AuthCache
	schemaCacheManager *lib.SchemaCacheManager
	computeSandbox     *sandbox.ComputeSandbox
}

func NewAPIServices(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *irminsqids.SQIDManager,
	localeManager *locales.LocaleManager,
	permissionService *permissions.Service,
	cacheStorage fiber.Storage,
	lakefsClient *lakefs.Client,
) *APIServices {
	authCache := &AuthCache{cache: make(map[string]*AuthCacheEntry)}
	schemaCacheManager := lib.NewSchemaCacheManager(env, logger, db)
	billingService := NewBillingService(db, env, logger)
	usageTracker := NewUsageTracker(db, billingService, lakefsClient, env, logger)
	oauthService := buildOAuthService(db, env, logger)
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
		BillingService:     billingService,
		UsageTracker:       usageTracker,
		OAuthService:       oauthService,
		authCache:          authCache,
		schemaCacheManager: schemaCacheManager,
		computeSandbox:     sandbox.NewComputeSandbox(env, db, logger),
	}
}

// buildOAuthService constructs the OAuth service with production wiring.
// Uses lib.NewSafeHTTPClient for SSRF protection on vendor calls and the
// stub ConfigProvider until the SDK extension lands. Returns nil if the
// constructor fails — caller code guards against nil before use.
func buildOAuthService(d *db.Database, env *utils.CoreAPIEnv, logger *slog.Logger) *oauth.Service {
	svc, err := oauth.NewService(oauth.Options{
		DB:          d,
		Provider:    newConnectorsClientOAuthConfigProvider(),
		HTTPClient:  lib.NewSafeHTTPClient(context.Background()),
		Logger:      logger,
		RedirectURI: env.URL + "/api/v1/oauth/callback",
	})
	if err != nil {
		logger.Error("oauth service unavailable", "error", err)
		return nil
	}
	return svc
}
