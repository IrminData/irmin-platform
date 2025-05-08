package lib

import (
	"irmin-connectors/db"
	"log/slog"
	"net/http"
	"strings"
)

// ValidateConnectorSystemToken validates the provided token against the system token of the connector registration instance.
func ValidateConnectorSystemToken(
	d *db.Database,
	logger *slog.Logger,
	connectorName string,
	w http.ResponseWriter,
	r *http.Request,
) bool {
	// Get authentication bearer token from the request headers
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")

	// Fetch matching registerations by connector name
	registrations, err := d.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		logger.Error("Error fetching connectors from the database",
			"error", err,
			"connector_name", connectorName)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return false
	}
	if len(registrations) == 0 {
		logger.Warn("No connector registration found",
			"connector_name", connectorName)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return false
	}

	// Validate the provided token against the registration instance
	var validToken = false
	for _, registrationInstance := range registrations {
		if token == registrationInstance.SystemToken {
			validToken = true
		}
	}
	if !validToken {
		logger.Warn("Invalid token provided",
			"connector_name", connectorName)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}
