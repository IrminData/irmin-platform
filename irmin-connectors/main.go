package main

import (
	db "irmin-connectors/db"
	"irmin-connectors/register"
	"irmin-connectors/routes"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file.
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Read values from environment variables
	url := os.Getenv("URL")
	apiBaseURL := os.Getenv("IRMIN_API_BASE_URL")
	apiToken := os.Getenv("IRMIN_API_TOKEN")

	if apiBaseURL == "" || apiToken == "" || url == "" {
		log.Fatalf("Missing required environment variables: URL, IRMIN_API_BASE_URL or IRMIN_API_TOKEN")
	}

	// Initialise the database.
	err = db.InitialiseDB("connectors.db")
	if err != nil {
		log.Fatalf("Cannot initialise DB: %v", err)
	}

	// Setup routes for connectors and start the server.
	r := routes.SetupRoutes()
	log.Printf("Starting server on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, r))

	// Register connectors.
	register.RegisterPostgresConnector(apiBaseURL, apiToken, url)
}
