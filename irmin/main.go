package main

import (
	"flag"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/routes"
	"irmin-api/utils"
	"log"

	"github.com/gofiber/fiber/v3"
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

	// Initialize the bucket client to make sure we can connect to the S3 bucket
	_, err = lib.CreateBucketClient()
	if err != nil {
		log.Fatalf("failed to create bucket client: %v", err)
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

	// Register the API routes
	routes.RegisterAPIRoutes(app)

	// Start the server
	log.Fatal(app.Listen(":" + env.Port))
}
