package postgresControllers

import (
	"encoding/json"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"
	"os"
)

var defaultConnectorInfo = models.ConnectorDetails{
	Name:             "PostgreSQL",
	Description:      "Import and export data from PostgreSQL databases.",
	Version:          "0.1.0",
	StructureVersion: "1.0.0",
	Author:           "Tim Borovkov / Irmin",
	APIBaseURL:       "/postgres",
	LogoURL:          "/public/postgres.png",
	Capabilities:     []string{"pull", "push", "event"},
	Locales:          []string{"en"},
	PrimaryCategory:  "database",
	Categories:       []string{"database"},
	AuthorEmail:      "hello@irmin.co",
	ReadMoreURL:      "/postgres/details",
}

func Info(w http.ResponseWriter, r *http.Request) {
	// Retrieve the base URL from the environment
	baseUrl := os.Getenv("URL")

	// Update the default connector info with the base URL
	info := defaultConnectorInfo
	info.LogoURL = baseUrl + info.LogoURL
	info.APIBaseURL = baseUrl + info.APIBaseURL

	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(info.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Send the default connector details
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}
