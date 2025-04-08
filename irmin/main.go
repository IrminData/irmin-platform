package main

import (
	"flag"
	"irmin-api/db"
	"irmin-api/routes"
	"irmin-api/utils"
	"log"
	"net/http"
	"sort"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cache"
	"github.com/gofiber/fiber/v3/middleware/compress"
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
	if err := db.InitialiseDB(); err != nil {
		log.Fatalf("failed to initialise the database: %v", err)
	}

	// Reset the database
	if *reset {
		if err := db.Reset(); err != nil {
			log.Fatalf("failed to run migrations: %v", err)
		}
	}

	// Run migrations
	if *migrate {
		if err := db.Migrate(); err != nil {
			log.Fatalf("failed to run migrations: %v", err)
		}
	}

	// Initialize a new Fiber app
	app := fiber.New()

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

	// Register the API routes
	routes.RegisterAPIRoutes(app)

	// Start the server
	log.Fatal(app.Listen(":" + env.Port))
}
