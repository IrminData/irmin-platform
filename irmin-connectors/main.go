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
	"net"
	"net/http"
	"os"
	"os/signal"
	"sort"
	"strings"
	"syscall"
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
	// StartupTimeoutSeconds is the duration for which the startup is allowed to take.
	StartupTimeoutSeconds = 30

	// MaxStartupAttempts is the maximum number of attempts to start the server.
	MaxStartupAttempts = 600

	// StartupAttemptsInterval is the interval between startup attempts.
	StartupAttemptsInterval = 50 * time.Millisecond

	// ConnectionTimeout is the timeout for TCP connection attempts.
	ConnectionTimeout = 100 * time.Millisecond

	// CacheExpirationSeconds is the duration for which the cache is valid.
	CacheExpirationSeconds = 10

	// BodyLimitBytes is the maximum body size in bytes.
	BodyLimitBytes = 5 * 1024 * 1024 * 1024 // 5 GB
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

// waitForServerReady waits for the server to be ready by attempting to connect to it.
// Returns true if server is ready, false if context is cancelled or max attempts reached.
func waitForServerReady(ctx context.Context, port string, maxAttempts int) bool {
	address := ":" + port

	for range maxAttempts {
		select {
		case <-ctx.Done():
			return false
		default:
		}

		conn, err := net.DialTimeout("tcp", address, ConnectionTimeout)
		if err == nil {
			if closeErr := conn.Close(); closeErr != nil {
				log.Printf("Warning: failed to close connection: %v", closeErr)
			}
			return true
		}

		// Wait a bit before retrying
		time.Sleep(StartupAttemptsInterval)
	}

	return false
}

func main() {
	// Define flags.
	skipRegistrations := flag.Bool("skip-registrations", false, "Skip connector registrations")
	migrate := flag.Bool("migrate", false, "Run database migrations")
	flag.Parse()

	// Create context for startup timeout (reasonable time limit) - do this early so it can be used throughout
	startupCtx, startupCancel := context.WithTimeout(context.Background(), StartupTimeoutSeconds*time.Second)

	app, err := NewConnectorsApp(*migrate)
	if err != nil {
		startupCancel()
		log.Fatalf("Failed to initialize application: %v", err)
	}

	// Register the API routes
	app.App.Get("/public/*", static.New("./public"))
	connectors.SetupConnectorRoutes(app)

	// Channel for server errors
	serverErr := make(chan error, 1)

	// Start the server
	go func() {
		log.Printf("Server starting on port %s...", app.Env.Port)

		// Try to start the server
		appListenErr := app.App.Listen(":"+app.Env.Port, fiber.ListenConfig{
			EnablePrefork: app.Env.PreforkEnabled,
		})

		// If Listen returns, it's either due to an error or graceful shutdown
		serverErr <- appListenErr
	}()

	// Setup graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Wait for server to be ready or fail
	serverReady := make(chan bool, 1)
	go func() {
		// Wait for server to actually accept connections
		ready := waitForServerReady(startupCtx, app.Env.Port, MaxStartupAttempts)
		serverReady <- ready
	}()

	// Wait for startup completion or failure
	select {
	case appListenErr := <-serverErr:
		// Server returned an error (startup failure)
		startupCancel()
		log.Fatalf("Server failed to start: %v", appListenErr)
	case ready := <-serverReady:
		if !ready {
			startupCancel()
			log.Fatalf("Server failed to become ready within startup timeout")
		}

		// Server is confirmed ready - startup phase is complete
		startupCancel()
		log.Printf("Server successfully started and ready on port %s", app.Env.Port)

		// Initialize connectors after server is ready
		if initConnErr := initializeConnectors(app, *skipRegistrations); initConnErr != nil {
			log.Printf("Error initializing connectors: %v", initConnErr)
			// Don't exit here, just log the error and continue
		}

		// Now wait for shutdown signal or runtime error
		select {
		case appListenErr := <-serverErr:
			// Server encountered a runtime error or was shut down
			if appListenErr != nil {
				log.Printf("Server error: %v", appListenErr)
			}
		case <-quit:
			log.Println("Shutting down server...")

			// Shutdown with timeout
			if appShutdownErr := app.App.Shutdown(); appShutdownErr != nil {
				log.Printf("Server forced to shutdown: %v", appShutdownErr)
			}

			log.Println("Server gracefully stopped")
		}
	}
}
