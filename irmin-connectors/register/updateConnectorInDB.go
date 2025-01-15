package register

import (
	"encoding/json"
	"fmt"
	"irmin-connectors/db"
	connectorModels "irmin-connectors/models"

	"github.com/IrminData/irmin-sdk-go/models"
)

// updateConnectorInDB updates the connector in the database, including registration and connector information.
func updateConnectorInDB(connectorId *string, connector models.Connector, connectorURL, token string) error {
	if connectorId != nil {
		// Remove existing connector operations from the database
		ops, err := db.GetOperationsByConnectorID(*connectorId)
		if err != nil {
			fmt.Printf("Error fetching connector operations: %v\n", err)
			return err
		}
		for _, op := range ops {
			err = db.DeleteOperation(op.ID)
			if err != nil {
				fmt.Printf("Error deleting operation: %v\n", err)
				return err
			}
		}

		// Remove current connector registration from the database
		regs, err := db.GetConnectorRegistrationsByConnectorID(*connectorId)
		if err != nil {
			fmt.Printf("Error fetching connector registration: %v\n", err)
			return err
		}
		for _, reg := range regs {
			err = db.DeleteConnectorRegistration(reg.ID)
			if err != nil {
				fmt.Printf("Error deleting connector registration: %v\n",
					err)
				return err
			}
		}

		// Remove current connector information from the database
		infos, err := db.GetConnectorInfosByConnectorID(*connectorId)
		if err != nil {
			fmt.Printf("Error fetching connector information: %v\n", err)
			return err
		}
		for _, info := range infos {
			err = db.DeleteConnector(info.ID)
			if err != nil {
				fmt.Printf("Error deleting connector information: %v\n", err)
				return err
			}
		}
	}

	// Create a new connector registration
	err := db.CreateConnectorRegistration(&connectorModels.ConnectorRegistration{
		SystemToken: token,
		ConnectorID: *connectorId,
	})
	if err != nil {
		fmt.Printf("Error creating connector registration: %v\n", err)
		return err
	}

	// Create a new connector information entry
	capabilities, err := json.Marshal(connector.Capabilities)
	if err != nil {
		fmt.Printf("Error marshalling capabilities: %v\n", err)
		return err
	}
	locales, err := json.Marshal(connector.Locales)
	if err != nil {
		fmt.Printf("Error marshalling locales: %v\n", err)
		return err
	}
	categories, err := json.Marshal(connector.Categories)
	if err != nil {
		fmt.Printf("Error marshalling categories: %v\n", err)
		return err
	}
	err = db.CreateConnector(&connectorModels.ConnectorInfo{
		ID:               *connectorId,
		Name:             connector.Name,
		Description:      connector.Description,
		Version:          connector.Version,
		StructureVersion: connector.StructureVersion,
		Author:           connector.Author,
		APIBaseURL:       connectorURL,
		LogoURL:          connector.LogoURL,
		Capabilities:     capabilities,
		Locales:          locales,
		PrimaryCategory:  (*connectorModels.ConnectorCategory)(connector.PrimaryCategory),
		Categories:       categories,
		AuthorEmail:      connector.AuthorEmail,
		Documentation:    connector.Documentation,
		ReadMoreURL:      connector.ReadMoreURL,
	})
	if err != nil {
		fmt.Printf("Error creating connector information: %v\n", err)
		return err
	}

	return nil
}
