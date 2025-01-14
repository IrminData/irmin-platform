package main

import (
	"irmin-connectors/routes"
	dbutil "irmin-connectors/utils"
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

	// Initialise the database.
	err = dbutil.InitialiseDB("connectors.db")
	if err != nil {
		log.Fatalf("Cannot initialise DB: %v", err)
	}

	// Setup routes and start the server.
	r := routes.SetupRoutes()

	log.Printf("Starting server on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
