package postgresControllers

import (
	"encoding/json"
	"fmt"
	connectorModels "irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"
	"os"
)

// Read base URL from environment variables
var baseUrl = os.Getenv("URL")
var defaultConnectorInfo = connectorModels.ConnectorDetails{
	Name:             "PostgreSQL",
	Description:      "Import and export data from PostgreSQL databases.",
	Version:          "0.1.0",
	StructureVersion: "0.0.1",
	Author:           "Tim Borovkov / Irmin",
	APIBaseURL:       "/postgres",
	LogoURL:          fmt.Sprintf("%s/public/logos/postgres.png", baseUrl),
	Capabilities:     []string{"pull", "push", "event"},
	Locales:          []string{"en"},
	PrimaryCategory:  "database",
	Categories:       []string{"database"},
	AuthorEmail:      "hello@irmin.co",
	Documentation:    fmt.Sprintf("%s/postgres/docs", baseUrl),
	ReadMoreURL:      fmt.Sprintf("%s/postgres/read-more", baseUrl),
}

func Info(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Send the default connector details
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(defaultConnectorInfo)
}
