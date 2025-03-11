package main

import (
	"irmin-api/db"
	"irmin-api/routes"
	"irmin-api/utils"
	"log"

	"github.com/gofiber/fiber/v3"
)

func main() {
	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		log.Fatalf("failed to load environment variables: %v", err)
	}

	// Initialize the database
	if err := db.InitialiseDB(); err != nil {
		log.Fatalf("failed to initialise the database: %v", err)
	}

	// Initialize a new Fiber app
	app := fiber.New()

	// Register the API routes
	routes.RegisterAPIRoutes(app)

	// Start the server
	log.Fatal(app.Listen(":" + env.Port))
}
