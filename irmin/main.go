package main

import (
	"context"
	"flag"
	"irmin-api/db"
	"irmin-api/engine"
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

// setupDatabase initializes and configures the database based on command line flags.
func setupDatabase(env *utils.CoreAPIEnv) (*db.Database, error) {
	database, err := db.InitialiseDB(env)
	if err != nil {
		return nil, err
	}

	// Handle command line flags
	reset := flag.Bool("reset", false, "Reset the database")
	migrate := flag.Bool("migrate", false, "Run database migrations")
	flag.Parse()

	if *reset {
		if dbResetErr := database.Reset(); dbResetErr != nil {
			return nil, dbResetErr
		}
	}

	if *migrate {
		if dbMigrateErr := database.Migrate(); dbMigrateErr != nil {
			return nil, dbMigrateErr
		}
	}

	return database, nil
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
) (*orchestrator.Orchestrator, *utils.SQIDManager, *locales.LocaleManager, error) {
	// Initialize data engine
	dataEngine, err := engine.NewClient(context.Background(), "en", slog.Default(), env)
	if err != nil {
		return nil, nil, nil, err
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
	sqidManager := utils.NewSQIDManager(env)

	// Initialize locale manager
	localeManager, err := locales.New()
	if err != nil {
		return nil, nil, nil, err
	}

	return orchestrator, sqidManager, localeManager, nil
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
	orchestrator, sqidManager, localeManager, err := setupServices(env, database)
	if err != nil {
		log.Fatalf("failed to setup services: %v", err)
	}

	// Register routes
	routes.RegisterAPIRoutes(app, database, slog.Default(), env, orchestrator, sqidManager, localeManager)

	// Start server
	startServer(app, env)

	// Keep the main process running
	select {}
}
