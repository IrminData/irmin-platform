package postgrescontrollers

import (
	"encoding/json"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"
	"net/http"
	"os"
)

// Info handles the /info endpoint for the PostgreSQL connector.
func (c *Controller) Info(w http.ResponseWriter, r *http.Request) {
	// Retrieve the base URL from the environment
	baseURL := os.Getenv("URL")

	// Get the connector info from config
	info := config.GetConnectorInfo()
	info.LogoURL = baseURL + info.LogoURL
	info.APIBaseURL = baseURL + info.APIBaseURL
	info.ReadMoreURL = baseURL + info.ReadMoreURL

	// Make sure the request is authorized by validating the system token
	if !lib.ValidateConnectorSystemToken(c.DB, c.Logger, info.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Send the connector details
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(info); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
