package main

import (
	"context"
	"flag"
	"irmin-api/db"
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

func main() {
	// Define flags.
	reset := flag.Bool("reset", false, "Reset the database")
	migrate := flag.Bool("migrate", false, "Run database migrations")
	flag.Parse()

	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		log.Fatalf("failed to load environment variables: %v", err)
	}

	// Initialize the database
	database, err := db.InitialiseDB()
	if err != nil {
		log.Fatalf("failed to initialise the database: %v", err)
	}

	// Reset the database
	if *reset {
		if err := database.Reset(); err != nil {
			log.Fatalf("failed to run migrations: %v", err)
		}
	}

	// Run migrations
	if *migrate {
		if err := database.Migrate(); err != nil {
			log.Fatalf("failed to run migrations: %v", err)
		}
	}

	// Initialize a new Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "Irmin API",
		BodyLimit: 1024 * 1024 * 1024 * 5, // 5 GB
	})

	// Return request ID in the response headers
	app.Use(requestid.New())

	// Compress responses
	app.Use(compress.New(
		compress.Config{
			Level: compress.LevelBestSpeed,
		},
	))

	// Cache responses for 10 seconds for GET, HEAD, and OPTIONS methods.
	// Cache key is generated based on the request path, query parameters, and authorization header.
	app.Use(cache.New(
		cache.Config{
			Expiration: 10 * time.Second,
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
		},
	))

	// Enable helmet
	if env.HelmetEnabled {
		app.Use(helmet.New())
	}

	// Enable CORS if configured
	if env.CorsEnabled {
		log.Println("CORS is enabled")
		// Split the allowed origins into a slice
		allowedOrigins := strings.Split(env.CorsOrigins, ",")
		// Trim whitespace from each origin
		for i, origin := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(origin)
		}
		log.Println("Allowed origins:", allowedOrigins)
		// Enable CORS with default settings
		app.Use(cors.New(cors.Config{
			AllowOrigins:     allowedOrigins,
			AllowCredentials: true,
		}))
	}

	// Start the orchestrator
	orchestrator := orchestrator.NewOrchestrator(database, slog.Default(), env)
	if env.OrchestratorEnabled {
		go orchestrator.StartOrchestrator(context.Background())
	}

	// Register the Core API routes
	routes.RegisterAPIRoutes(app, database, slog.Default(), env, orchestrator)

	// Start the server in a goroutine
	go func() {
		if err := app.Listen(":" + env.Port); err != nil {
			log.Printf("Server error: %v", err)
		}
	}()

	// Keep the main process running
	select {}
}
