package lib

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"log"
)

// FormatConnectionResponse creates a connection response object from a connection object.
func FormatConnectionResponse(connection db.Connection) (*db.ConnectionResponse, error) {
	// Format the owner
	ownerSqid, err := utils.EncodeSqids("users", uint64(connection.OwnerID))
	if err != nil {
		log.Printf("Error encoding owner sqid: %v", err)
		return nil, fmt.Errorf("error encoding owner sqid: %v", err)
	}
	ownerResponse := db.UserResponse{
		ID:             ownerSqid,
		FirstName:      connection.Owner.FirstName,
		LastName:       connection.Owner.LastName,
		Email:          connection.Owner.Email,
		Phone:          connection.Owner.Phone,
		Company:        connection.Owner.Company,
		ProfilePicture: connection.Owner.ProfilePicture,
	}
	// Format the connector
	connectorSqid, err := utils.EncodeSqids("connectors", uint64(connection.ConnectorID))
	if err != nil {
		return nil, fmt.Errorf("error encoding connector sqid: %v", err)
	}
	connectorResponse := db.ConnectorResponse{
		ID:              connectorSqid,
		Name:            connection.Connector.Name,
		Description:     connection.Connector.Description,
		Version:         connection.Connector.Version,
		Author:          connection.Connector.Author,
		LogoURL:         connection.Connector.LogoURL,
		Capabilities:    connection.Connector.Capabilities,
		Locales:         connection.Connector.Locales,
		Categories:      connection.Connector.Categories,
		PrimaryCategory: connection.Connector.PrimaryCategory,
		AuthorEmail:     connection.Connector.AuthorEmail,
		ReadMoreURL:     connection.Connector.ReadMoreURL,
	}
	// Construct the connection response.
	connectionSqid, err := utils.EncodeSqids("connections", uint64(connection.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return nil, fmt.Errorf("error encoding connection sqid: %v", err)
	}
	connectionResponse := db.ConnectionResponse{
		ID:            connectionSqid,
		Name:          connection.Name,
		Description:   connection.Description,
		Documentation: connection.Documentation,
		Details:       connection.Details,
		Settings:      connection.Settings,
		Owner:         ownerResponse,
		Connector:     connectorResponse,
	}

	return &connectionResponse, nil
}
