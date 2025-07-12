package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

func FormatConnectorResponse(
	connector *db.Connector,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.Connector, error) {
	connectorSqid, err := sqidManager.Encode("connectors", uint64(connector.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding connector sqid: %w", err)
	}
	var capabilities []irminmodels.ConnectorCapability
	for _, capability := range connector.Capabilities {
		capabilities = append(capabilities, irminmodels.ConnectorCapability(capability))
	}
	var categories []irminmodels.ConnectorCategory
	for _, category := range connector.Categories {
		categories = append(categories, irminmodels.ConnectorCategory(category))
	}
	connectorResponse := irminmodels.Connector{
		ID:               connectorSqid,
		Name:             connector.Name,
		Description:      connector.Description,
		Version:          connector.Version,
		StructureVersion: connector.StructureVersion,
		Author:           connector.Author,
		LogoURL:          connector.LogoURL,
		Capabilities:     capabilities,
		Locales:          connector.Locales,
		Categories:       categories,
		PrimaryCategory:  irminmodels.ConnectorCategory(connector.PrimaryCategory),
		AuthorEmail:      connector.AuthorEmail,
		ReadMoreURL:      connector.ReadMoreURL,
	}

	return &connectorResponse, nil
}
