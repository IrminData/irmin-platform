package connectors

import (
	"context"
	"errors"
	"fmt"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"log/slog"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const defaultTokenLength = 32

// errConnectorNotFound is returned when the Irmin API responds with 404 during an update,
// indicating the connector was deleted from the Irmin DB and needs to be re-registered.
var errConnectorNotFound = errors.New("connector not found in Irmin API")

// registerConnector registers a new connector with the Irmin API.
func registerConnector(
	ctx context.Context,
	database *db.Database,
	logger *slog.Logger,
	apiBaseURL, apiToken, baseURL, connectorName, connectorSlug string,
) (*irminmodels.Connector, error) {
	// Initialise the client and service
	apiClient := irmincore.NewClient(apiBaseURL, apiToken, "en")

	// Generate a random system token to be used by the Irmin API to access the connector.
	token, err := utils.GenerateToken(defaultTokenLength)
	if err != nil {
		return nil, fmt.Errorf("error generating token: %w", err)
	}

	// Structure the base URL for the connector
	connectorURL := fmt.Sprintf("%s/%s", baseURL, connectorSlug)

	// Fetch matching connector registrations from the database
	connectorRegistration, err := database.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		if errors.Is(err, db.ErrConnectorRegistrationNotFound) {
			// No registration found, proceed with creating a new one
			connectorRegistration = nil
		} else {
			return nil, fmt.Errorf("error fetching connector registration: %w", err)
		}
	}

	// If the connector is already registered, try to update it.
	// On success, return immediately. On 404 (connector deleted from Irmin DB), fall through
	// to re-register. On any other error, return the error.
	if connectorRegistration != nil {
		updated, updateErr := tryUpdateConnector(
			ctx, database, logger, apiClient,
			connectorRegistration, connectorURL, token, connectorName,
		)
		if updateErr != nil && !errors.Is(updateErr, errConnectorNotFound) {
			return nil, updateErr
		}
		if updated != nil {
			return updated, nil
		}
		// 404 — fall through to register a new connector.
	}

	// Make sure the connector is registered in the database for the token validation
	//
	// Explanation: The Irmin API will call /info endpoint of the connector with the provided
	// system token to get information about it. If the connector is not registered in the database,
	// the API will not be able to validate the token and the registration will fail.
	tempRegistration, err := database.CreateConnectorRegistration(&db.ConnectorRegistration{
		IrminID:       fmt.Sprintf("temp-%s", connectorSlug),
		ConnectorName: connectorName,
		SystemToken:   token,
	})
	if err != nil {
		return nil, fmt.Errorf("error updating connector in the database: %w", err)
	}

	// Ensure cleanup of temporary registration regardless of success or failure
	defer func() {
		if deleteErr := database.DeleteConnectorRegistration(tempRegistration.ID); deleteErr != nil {
			logger.ErrorContext(ctx, "Failed to delete temporary connector registration",
				"registration_id", tempRegistration.ID,
				"error", deleteErr)
		}
	}()

	// Send a request to register the connector
	newConnector, res, err := apiClient.RegisterNewConnector(
		ctx,
		irmincore.ConnectorRequest{
			URL:         connectorURL,
			SystemToken: token,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("error registering connector: %w", err)
	}
	logger.InfoContext(ctx, "Connector registered",
		"message", res.Message,
		"connector_id", newConnector.ID,
		"connector_name", connectorName,
		"connector_url", connectorURL,
	)

	// Create a new connector in the database
	err = lib.UpdateConnectorInDB(database, logger, newConnector.ID, token, connectorName)
	if err != nil {
		return nil, fmt.Errorf("error updating connector in the database: %w", err)
	}

	return newConnector, nil
}

// tryUpdateConnector attempts to update an existing connector registration with the Irmin API.
// Returns the updated connector on success, nil on 404 (connector deleted from Irmin DB),
// or an error for any other failure.
func tryUpdateConnector(
	ctx context.Context,
	database *db.Database,
	logger *slog.Logger,
	apiClient *irmincore.Client,
	registration *db.ConnectorRegistration,
	connectorURL, token, connectorName string,
) (*irminmodels.Connector, error) {
	if err := lib.UpdateConnectorInDB(database, logger, registration.IrminID, token, connectorName); err != nil {
		return nil, fmt.Errorf("error updating connector in the database: %w", err)
	}

	newConnector, res, err := apiClient.UpdateRegisteredConnector(
		ctx,
		registration.IrminID,
		irmincore.ConnectorRequest{
			URL:         connectorURL,
			SystemToken: token,
		},
	)
	if err != nil {
		if strings.Contains(err.Error(), "status 404") {
			logger.WarnContext(ctx, "Connector not found in Irmin API, re-registering",
				"connector_name", connectorName,
				"old_irmin_id", registration.IrminID,
			)
			return nil, errConnectorNotFound
		}
		return nil, fmt.Errorf("error updating connector: %w", err)
	}

	logger.InfoContext(ctx, "Connector updated",
		"message", res.Message,
		"connector_id", newConnector.ID,
		"connector_name", connectorName,
		"connector_url", connectorURL,
		"connector_token", token,
	)
	return newConnector, nil
}
