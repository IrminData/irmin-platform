package main

import (
	"context"
	"flag"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/routes"
	"irmin-api/utils"
	"log"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"

	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cache"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

const (
	// MaxRequestBodySize is the maximum size of request body in bytes (5 GB).
	MaxRequestBodySize = 5 * 1024 * 1024 * 1024
	// CacheExpirationDuration is the duration for which responses are cached.
	CacheExpirationDuration = 10 * time.Second
)

// setupDefaultTags seeds default tags for all workspaces.
func setupDefaultTags(d *db.Database) error {
	// Fetch all workspaces
	workspaces, fetchWorkspacesErr := d.GetAllWorkspaces()
	if fetchWorkspacesErr != nil {
		return fetchWorkspacesErr
	}

	// Seed default tags for every workspace
	for _, workspace := range workspaces {
		seedDefaultTagsErr := lib.SeedDefaultTags(d, workspace.ID)
		if seedDefaultTagsErr != nil {
			return seedDefaultTagsErr
		}
	}

	return nil
}

func setupRolesAndPolicies(d *db.Database, overridePolicies *bool) error {
	// Seed initial roles
	if seedRolesErr := lib.SeedRoles(d); seedRolesErr != nil {
		return seedRolesErr
	}

	// Fetch all workspaces
	workspaces, fetchWorkspacesErr := d.GetAllWorkspaces()
	if fetchWorkspacesErr != nil {
		return fetchWorkspacesErr
	}

	// Set default policies for every workspace
	for _, workspace := range workspaces {
		setDefaultPoliciesErr := lib.SetDefaultPolicies(d, workspace.ID, *overridePolicies)
		if setDefaultPoliciesErr != nil {
			return setDefaultPoliciesErr
		}
	}

	// Set default role for every user without a role
	if assignDefaultRolesErr := lib.AssignDefaultRolesToUsersWithoutRoles(d); assignDefaultRolesErr != nil {
		return assignDefaultRolesErr
	}

	return nil
}

// setupDatabase initializes and configures the database based on command line flags.
func setupDatabase(env *utils.CoreAPIEnv) (*db.Database, error) {
	d, err := db.InitialiseDB(env)
	if err != nil {
		return nil, err
	}

	// Handle command line flags
	reset := flag.Bool("reset", false, "Reset the database")
	migrate := flag.Bool("migrate", false, "Run database migrations")
	overridePolicies := flag.Bool("override-policies", false, "Override existing policies")
	seedTags := flag.Bool("seed-tags", false, "Seed default tags for all workspaces")
	flag.Parse()

	// Empty the database if the reset flag is set
	if *reset {
		if dbResetErr := d.Reset(); dbResetErr != nil {
			return nil, dbResetErr
		}
	}

	// Run database migrations if the migrate flag is set
	if *migrate {
		// Create database tables, add indexes, or update existing once
		if dbMigrateErr := d.Migrate(); dbMigrateErr != nil {
			return nil, dbMigrateErr
		}

		// Setup roles and policies
		if setupRolesAndPoliciesErr := setupRolesAndPolicies(d, overridePolicies); setupRolesAndPoliciesErr != nil {
			return nil, setupRolesAndPoliciesErr
		}
	}

	// Seed default tags for all workspaces if the seedTags flag is set
	if *seedTags {
		if setupDefaultTagsErr := setupDefaultTags(d); setupDefaultTagsErr != nil {
			return nil, setupDefaultTagsErr
		}
	}

	return d, nil
}

// setupFiberApp creates and configures a new Fiber application.
func setupFiberApp(env *utils.CoreAPIEnv) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:   "Irmin API",
		BodyLimit: MaxRequestBodySize,
	})

	// Add middleware
	app.Use(requestid.New())
	app.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))
	app.Use(setupCache())

	if env.HelmetEnabled {
		app.Use(helmet.New())
	}

	if env.CorsEnabled {
		app.Use(setupCORS(env))
	}

	return app
}

// setupCache configures and returns the cache middleware.
func setupCache() fiber.Handler {
	return cache.New(cache.Config{
		Expiration: CacheExpirationDuration,
		Methods: []string{
			http.MethodGet,
			http.MethodHead,
			http.MethodOptions,
		},
		KeyGenerator: func(c fiber.Ctx) string {
			queriesMap := c.Queries()
			var keys []string
			for key := range queriesMap {
				keys = append(keys, key)
			}
			sort.Strings(keys)
			queries := ""
			for _, key := range keys {
				value := queriesMap[key]
				if queries == "" {
					queries = key + "=" + value
				} else {
					queries += "&" + key + "=" + value
				}
			}
			return c.Path() + queries + c.Get("authorization")
		},
	})
}

// setupCORS configures and returns the CORS middleware.
func setupCORS(env *utils.CoreAPIEnv) fiber.Handler {
	allowedOrigins := strings.Split(env.CorsOrigins, ",")
	for i, origin := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(origin)
	}
	log.Println("Allowed origins:", allowedOrigins)

	return cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowCredentials: true,
	})
}

// setupServices initializes all required services.
func setupServices(
	env *utils.CoreAPIEnv,
	database *db.Database,
) (*orchestrator.Orchestrator, *irminsqids.SQIDManager, *locales.LocaleManager, *lib.PermissionService, error) {
	// Initialize data engine
	dataEngine, err := engine.NewClient(context.Background(), "en", slog.Default(), env)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	// Initialize orchestrator
	orchestrator := orchestrator.NewOrchestrator(database, slog.Default(), env, dataEngine)
	if env.OrchestratorEnabled {
		go func() {
			if orchestratorStartErr := orchestrator.StartOrchestrator(context.Background()); orchestratorStartErr != nil {
				log.Printf("Orchestrator error: %v", err)
			}
		}()
	}

	// Initialize SQID manager
	sqidManager := irminsqids.NewSQIDManager(env.SqidAlphabet)

	// Initialize locale manager
	localeManager, err := locales.New()
	if err != nil {
		return nil, nil, nil, nil, err
	}

	// Initialize permission service
	permissionService := lib.NewPermissionService(database, slog.Default())

	return orchestrator, sqidManager, localeManager, permissionService, nil
}

// startServer starts the Fiber server in a goroutine.
func startServer(app *fiber.App, env *utils.CoreAPIEnv) {
	go func() {
		if err := app.Listen(":"+env.Port, fiber.ListenConfig{
			EnablePrefork: env.PreforkEnabled,
		}); err != nil {
			log.Printf("Server error: %v", err)
		}
	}()
}

func main() {
	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		log.Fatalf("failed to load environment variables: %v", err)
	}

	// Setup database
	database, err := setupDatabase(env)
	if err != nil {
		log.Fatalf("failed to setup database: %v", err)
	}

	// Setup Fiber app
	app := setupFiberApp(env)

	// Setup services
	orchestrator, sqidManager, localeManager, permissionService, err := setupServices(env, database)
	if err != nil {
		log.Fatalf("failed to setup services: %v", err)
	}

	// Register routes
	routes.RegisterAPIRoutes(
		app,
		database,
		slog.Default(),
		env,
		orchestrator,
		sqidManager,
		localeManager,
		permissionService,
	)

	// Start server
	startServer(app, env)

	// Keep the main process running
	select {}
}
