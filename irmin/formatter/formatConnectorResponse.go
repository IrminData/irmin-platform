package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatConnectorResponse(connector db.Connector) (*irminModels.Connector, error) {
	connectorSqid, err := utils.EncodeSqids("connectors", uint64(connector.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding connector sqid: %v", err)
	}
	var capabilities []irminModels.ConnectorCapability
	for _, capability := range connector.Capabilities {
		capabilities = append(capabilities, irminModels.ConnectorCapability(capability))
	}
	var categories []irminModels.ConnectorCategory
	for _, category := range connector.Categories {
		categories = append(categories, irminModels.ConnectorCategory(category))
	}
	connectorResponse := irminModels.Connector{
		ID:              connectorSqid,
		Name:            connector.Name,
		Description:     connector.Description,
		Version:         connector.Version,
		Author:          connector.Author,
		LogoURL:         connector.LogoURL,
		Capabilities:    capabilities,
		Locales:         connector.Locales,
		Categories:      categories,
		PrimaryCategory: irminModels.ConnectorCategory(connector.PrimaryCategory),
		AuthorEmail:     connector.AuthorEmail,
		ReadMoreURL:     connector.ReadMoreURL,
	}

	return &connectorResponse, nil
}
