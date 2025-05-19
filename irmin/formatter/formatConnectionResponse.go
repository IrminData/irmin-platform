package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatConnectionResponse creates a connection response object from a connection object.
func FormatConnectionResponse(
	connection *db.Connection,
	sqidManager *utils.SQIDManager,
) (*irminmodels.Connection, error) {
	// Structure the owner response.
	ownerResponse, err := FormatUserResponse(&connection.Owner, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting owner: %w", err)
	}
	// Format the connector
	connectorResponse, err := FormatConnectorResponse(&connection.Connector, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting connector response: %w", err)
	}

	// Construct the connection response.
	connectionSqid, err := sqidManager.Encode("connections", uint64(connection.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding connection sqid: %w", err)
	}
	connectionResponse := irminmodels.Connection{
		ID:            connectionSqid,
		Name:          connection.Name,
		Description:   connection.Description,
		Documentation: connection.Documentation,
		Details:       irminmodels.CustomFieldValues(connection.Details),
		Settings:      irminmodels.CustomFieldValues(connection.Settings),
		Owner:         *ownerResponse,
		Connector:     *connectorResponse,
	}

	return &connectionResponse, nil
}
