package main

import (
	"context"
	"fmt"
	"irmin-connectors/connectors"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

const (
	readTimeout       = 5 * time.Second
	writeTimeout      = 10 * time.Second
	idleTimeout       = 120 * time.Second
	readHeaderTimeout = 5 * time.Second
)

// App holds all the application dependencies.
type App struct {
	DB     *db.Database
	Env    *utils.ConnectorsEnv
	Logger *slog.Logger
}

// NewApp creates a new application instance with all dependencies.
func NewApp() (*App, error) {
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

	database, err := db.InitialiseDB(true) // true to run migrations
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	return &App{
		DB:     database,
		Env:    env,
		Logger: slog.Default(),
	}, nil
}

func setupServer(r *mux.Router, port string) (*http.Server, net.Listener, error) {
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return nil, nil, err
	}

	server := &http.Server{
		Handler:           r,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
		ReadHeaderTimeout: readHeaderTimeout,
	}

	return server, listener, nil
}

func (app *App) initializeConnectors() error {
	if err := connectors.RegisterAllConnectors(app.DB, app.Logger, app.Env.APIBaseURL, app.Env.APIToken, app.Env.URL); err != nil {
		return err
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
	app, err := NewApp()
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	r := mux.NewRouter()
	r.PathPrefix("/public/").Handler(http.StripPrefix("/public/", http.FileServer(http.Dir("public"))))
	r = connectors.SetupConnectorRoutes(r, app.DB)

	server, listener, err := setupServer(r, app.Env.Port)
	if err != nil {
		log.Fatalf("Failed to setup server: %v", err)
	}

	go func() {
		log.Printf("Server starting on port %s...", app.Env.Port)
		if serveErr := server.Serve(listener); serveErr != nil && serveErr != http.ErrServerClosed {
			log.Fatalf("Server error: %v", serveErr)
		}
	}()

	if initConnErr := app.initializeConnectors(); initConnErr != nil {
		log.Fatalf("Error initializing connectors: %v", initConnErr)
	}

	select {}
}
