package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
)

func FormatConnectorResponse(connector db.Connector) (*db.ConnectorResponse, error) {
	// Format the connector SQID from the ID
	connectorSQID, err := utils.EncodeSqids("connectors", uint64(connector.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding SQID: %v", err)
	}

	// Create the response
	connectorResponse := db.ConnectorResponse{
		ID:              connectorSQID,
		Name:            connector.Name,
		Description:     connector.Description,
		Version:         connector.Version,
		Author:          connector.Author,
		LogoURL:         connector.LogoURL,
		Capabilities:    connector.Capabilities,
		Locales:         connector.Locales,
		Categories:      connector.Categories,
		PrimaryCategory: connector.PrimaryCategory,
		AuthorEmail:     connector.AuthorEmail,
		ReadMoreURL:     connector.ReadMoreURL,
	}

	return &connectorResponse, nil
}
