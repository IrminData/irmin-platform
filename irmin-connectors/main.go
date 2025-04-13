package main

import (
	"context"
	"irmin-connectors/connectors"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log"
	"net"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		log.Fatalf("Failed to load environment variables: %v", err)
	}

	// Initialise the database
	err = db.InitialiseDB()
	if err != nil {
		log.Fatalf("Cannot initialise DB: %v", err)
	}

	// Setup routes for all connectors
	r := mux.NewRouter()

	// Serve static files from the public directory.
	r.PathPrefix("/public/").Handler(http.StripPrefix("/public/", http.FileServer(http.Dir("public"))))

	// Setup routes for all connectors.
	r = connectors.SetupConnectorRoutes(r)

	// Manually create a net.Listener
	listener, err := net.Listen("tcp", ":"+env.Port)
	if err != nil {
		log.Fatalf("Failed to bind to port %s: %v", env.Port, err)
	}

	// Create an HTTP server, but don’t block yet
	server := &http.Server{
		Handler: r,
	}

	// Serve in a goroutine so main can continue
	go func() {
		log.Printf("Server starting on port %s...", env.Port)
		if serveErr := server.Serve(listener); serveErr != nil && serveErr != http.ErrServerClosed {
			log.Fatalf("Server error: %v", serveErr)
		}
	}()

	// Register all connectors
	err = connectors.RegisterAllConnectors(env.APIBaseURL, env.APIToken, env.URL)
	if err != nil {
		log.Fatalf("Error registering connectors: %v", err)
	}

	// Start the subscription listeners
	ctx := context.Background() // Create a new context for the subscription listeners
	// Get all connector registrations
	registrations, err := db.GetAllConnectorRegistrations()
	if err != nil {
		log.Fatalf("Error getting connector registrations: %v", err)
	}

	// Get all existing subscriptions
	subscriptions, err := db.GetAllSubscriptions()
	if err != nil {
		log.Fatalf("Error getting subscriptions: %v", err)
	}

	// Loop through all subscriptions and start listeners
	for _, subscription := range subscriptions {
		// Find the registration for the subscription
		var registration db.ConnectorRegistration
		for _, reg := range registrations {
			if reg.ID == subscription.ConnectorRegistrationID {
				registration = reg
				break
			}
		}
		// Start the listener using the correct controller's controller
		err = connectors.StartConnectorSubsriptionListener(registration.ConnectorName, subscription, ctx)
		if err != nil {
			log.Printf("error starting subscription listener for subscription %d: %v", subscription.ID, err)
		}
	}

	// Block the main goroutine (so the program doesn’t exit immediately)
	select {}
}
