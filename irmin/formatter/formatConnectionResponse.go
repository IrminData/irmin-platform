package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"log"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatConnectionResponse creates a connection response object from a connection object.
func FormatConnectionResponse(connection db.Connection) (*irminModels.Connection, error) {
	// Format the owner
	ownerSqid, err := utils.EncodeSqids("users", uint64(connection.OwnerID))
	if err != nil {
		log.Printf("Error encoding owner sqid: %v", err)
		return nil, fmt.Errorf("error encoding owner sqid: %v", err)
	}
	ownerResponse := irminModels.User{
		ID:             ownerSqid,
		FirstName:      connection.Owner.FirstName,
		LastName:       connection.Owner.LastName,
		Email:          connection.Owner.Email,
		Phone:          connection.Owner.Phone,
		Company:        connection.Owner.Company,
		ProfilePicture: connection.Owner.ProfilePicture,
	}
	// Format the connector
	connectorResponse, err := FormatConnectorResponse(connection.Connector)
	if err != nil {
		log.Printf("Error formatting connector response: %v", err)
		return nil, fmt.Errorf("error formatting connector response: %v", err)
	}

	// Construct the connection response.
	connectionSqid, err := utils.EncodeSqids("connections", uint64(connection.ID))
	if err != nil {
		log.Printf("Error encoding workflow sqid: %v", err)
		return nil, fmt.Errorf("error encoding connection sqid: %v", err)
	}
	connectionResponse := irminModels.Connection{
		ID:            connectionSqid,
		Name:          connection.Name,
		Description:   connection.Description,
		Documentation: connection.Documentation,
		Details:       irminModels.CustomFieldValues(connection.Details),
		Settings:      irminModels.CustomFieldValues(connection.Settings),
		Owner:         ownerResponse,
		Connector:     *connectorResponse,
	}

	return &connectionResponse, nil
}
