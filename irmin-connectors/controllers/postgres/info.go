package postgresControllers

import (
	"encoding/json"
	connectorModels "irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"
)

var defaultConnectorInfo = connectorModels.ConnectorDetails{
	Name:             "PostgreSQL",
	Description:      "Connector for PostgreSQL databases",
	Version:          "0.1.0",
	StructureVersion: "0.0.1",
	Author:           "Tim Borovkov / Irmin",
	APIBaseURL:       "/postgres",
	LogoURL:          "/public/irmin-logo.png",
	Capabilities:     []string{"pull", "push", "webhook_patch", "webhook_pull"},
	Locales:          []string{"en"},
	PrimaryCategory:  "database",
	Categories:       []string{"database"},
	AuthorEmail:      "hello@irmin.co",
	Documentation:    "/postgres/docs",
	ReadMoreURL:      "/postgres/read-more",
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
