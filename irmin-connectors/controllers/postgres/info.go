package postgresControllers

import (
	"encoding/json"
	"net/http"

	connectorModels "irmin-connectors/models"
	"irmin-connectors/utils"
)

var primaryCategory = connectorModels.ConnectorCategoryDatabase
var authorEmail = "hello@irmin.co"
var docsUrl = "/postgres/docs"
var readMoreUrl = "/postgres/read-more"

var defaultConnectorInfo = connectorModels.ConnectorInfo{
	Name:             "PostgreSQL",
	Description:      "Connector for PostgreSQL databases",
	Version:          "0.1.0",
	StructureVersion: "0.0.1",
	Author:           "Tim Borovkov / Irmin",
	APIBaseURL:       "/postgres",
	LogoURL:          "/public/irmin-logo.png",
	Capabilities: func() []byte {
		capabilities, _ := json.Marshal([]string{"pull", "push", "webhook_patch", "webhook_pull"})
		return capabilities
	}(),
	Locales: func() []byte {
		locales, _ := json.Marshal([]string{"en"})
		return locales
	}(),
	PrimaryCategory: &primaryCategory,
	Categories: func() []byte {
		categories, _ := json.Marshal([]string{"database"})
		return categories
	}(),
	AuthorEmail:   &authorEmail,
	Documentation: &docsUrl,
	ReadMoreURL:   &readMoreUrl,
}

func Info(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r)

	// Send the default connector info
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(defaultConnectorInfo)
}
