package main

import (
	db "irmin-connectors/db"
	"irmin-connectors/register"
	"irmin-connectors/routes"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file
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

	// Initialise the database
	err = db.InitialiseDB("connectors.db")
	if err != nil {
		log.Fatalf("Cannot initialise DB: %v", err)
	}

	// Setup routes for connectors and start the server
	r := routes.SetupRoutes()

	// Manually create a net.Listener
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("Failed to bind to port %s: %v", port, err)
	}

	// Create an HTTP server, but don’t block yet
	server := &http.Server{
		Handler: r,
	}

	// Serve in a goroutine so main can continue
	go func() {
		log.Printf("Server starting on port %s...", port)
		if serveErr := server.Serve(listener); serveErr != nil && serveErr != http.ErrServerClosed {
			log.Fatalf("Server error: %v", serveErr)
		}
	}()

	// Register connectors
	register.RegisterPostgresConnector(apiBaseURL, apiToken, url)

	log.Println("Connector registered successfully.")

	// Block the main goroutine (so the program doesn’t exit immediately)
	select {}
}
