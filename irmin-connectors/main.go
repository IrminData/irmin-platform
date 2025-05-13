package main

import (
	"context"
	"flag"
	"fmt"
	"irmin-connectors/connectors"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"
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
	"github.com/gofiber/fiber/v3/middleware/static"
)

// Constants for the application.
const (
	// CacheExpirationSeconds is the duration for which the cache is valid.
	CacheExpirationSeconds = 10

	// BodyLimitBytes is the maximum body size in bytes.
	BodyLimitBytes = 5 * 1024 * 1024 * 1024 // 5 GB

	// CacheMethodGet is the HTTP method for GET requests.
	CacheMethodGet = http.MethodGet
	// CacheMethodHead is the HTTP method for HEAD requests.
	CacheMethodHead = http.MethodHead
	// CacheMethodOptions is the HTTP method for OPTIONS requests.
	CacheMethodOptions = http.MethodOptions
)

// NewConnectorsApp creates a new application instance with all dependencies and a Fiber app.
func NewConnectorsApp(runMigrations bool) (*models.ConnectorsApp, error) {
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

	database, err := db.InitialiseDB(runMigrations)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	// Initialize a new Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "Irmin Connectors",
		BodyLimit: BodyLimitBytes,
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
			Expiration: CacheExpirationSeconds * time.Second,
			Methods: []string{
				CacheMethodGet,
				CacheMethodHead,
				CacheMethodOptions,
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

	return &models.ConnectorsApp{
		App:    app,
		DB:     database,
		Env:    env,
		Logger: slog.Default(),
	}, nil
}

// initializeConnectors registers all connectors and starts the listeners for all subscriptions.
func initializeConnectors(app *models.ConnectorsApp, skipRegistrations bool) error {
	if !skipRegistrations {
		if err := connectors.RegisterAllConnectors(app.DB, app.Logger, app.Env.APIBaseURL, app.Env.APIToken, app.Env.URL); err != nil {
			return err
		}
	}

	registrations, err := app.DB.GetAllConnectorRegistrations()
	if err != nil {
		return err
	}

	subscriptions, err := app.DB.GetAllSubscriptions()
	if err != nil {
		return err
	}

	ctx := context.Background()
	for _, subscription := range subscriptions {
		for _, reg := range registrations {
			if reg.ID == subscription.ConnectorRegistrationID {
				if listenerErr := connectors.StartConnectorSubscriptionListener(ctx, reg.ConnectorName, subscription, app.DB, app.Logger); listenerErr != nil {
					log.Printf(
						"error starting subscription listener for subscription %d: %v",
						subscription.ID,
						listenerErr,
					)
				}
				break
			}
		}
	}
	return nil
}

func main() {
	// Define flags.
	skipRegistrations := flag.Bool("skip-registrations", false, "Skip connector registrations")
	migrate := flag.Bool("migrate", false, "Run database migrations")
	flag.Parse()

	app, err := NewConnectorsApp(*migrate)
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	// Register the API routes
	app.App.Get("/public/*", static.New("./public"))
	connectors.SetupConnectorRoutes(app)

	// Start the server
	go func() {
		log.Printf("Server starting on port %s...", app.Env.Port)
		log.Fatal(app.App.Listen(":" + app.Env.Port))
	}()

	if initConnErr := initializeConnectors(app, *skipRegistrations); initConnErr != nil {
		log.Fatalf("Error initializing connectors: %v", initConnErr)
	}

	select {}
}
