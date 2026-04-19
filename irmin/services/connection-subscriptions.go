package services

import (
	"context"
	"errors"
	"fmt"

	connectorsclient "irmin-api/connectors-client"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ErrConnectorCapabilityNotSupported indicates the connector doesn't support the required capability.
var ErrConnectorCapabilityNotSupported = errors.New("connector does not support required capability")

// ConnectionSubscriptionService handles business logic for connection subscriptions.
type ConnectionSubscriptionService struct {
	db     *db.Database
	apiURL string
}

// NewConnectionSubscriptionService creates a new connection subscription service.
func NewConnectionSubscriptionService(database *db.Database, apiURL string) *ConnectionSubscriptionService {
	return &ConnectionSubscriptionService{
		db:     database,
		apiURL: apiURL,
	}
}

// hasPatchEventCapability checks if a connector has the patch_event capability.
func hasPatchEventCapability(connector *db.Connector) bool {
	if connector == nil {
		return false
	}
	for _, cap := range connector.Capabilities {
		if cap == string(irminmodels.ConnectorCapabilityPatchEvent) {
			return true
		}
	}
	return false
}

// RegisterSubscriptionWithConnector registers a subscription with the connector service.
// It initializes a connector operation, subscribes to changes, and returns the connector subscription ID.
// If the connector doesn't support patch_event capability, it returns ErrConnectorCapabilityNotSupported.
func (s *ConnectionSubscriptionService) RegisterSubscriptionWithConnector(
	ctx context.Context,
	connection *db.Connection,
	subscription *db.ConnectionSubscription,
	connectionSqid string,
) (*uint, error) {
	// Check if connector supports patch_event capability
	if !hasPatchEventCapability(&connection.Connector) {
		return nil, ErrConnectorCapabilityNotSupported
	}

	// Create system client to initialize operation
	systemClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		connection.Connector.SystemToken,
		"en",
	).WithConnectionID(connection.ID)

	// Initialize operation with connection details
	operation, err := systemClient.InitOperation(ctx, connection.Details, connection.Settings)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", err)
	}

	// Create operation client
	opClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		operation.Token,
		"en",
	).WithConnectionID(connection.ID)

	// Build webhook URL for this connection
	// Format: {API_URL}/api/v1/webhooks/connectors/{connectionSqid}
	webhookURL := fmt.Sprintf("%s/api/v1/webhooks/connectors/%s", s.apiURL, connectionSqid)

	// Subscribe to changes
	connectorSubscription, err := opClient.SubscribeToChanges(ctx, webhookURL, subscription.WebhookToken)
	if err != nil {
		// Clean up the operation if subscription fails
		_ = systemClient.CancelOperation(ctx, operation.ID)
		return nil, fmt.Errorf("failed to subscribe to connector changes: %w", err)
	}

	return &connectorSubscription.ID, nil
}

// UnregisterSubscriptionFromConnector removes a subscription from the connector service.
// It cancels the operation and unsubscribes from changes.
func (s *ConnectionSubscriptionService) UnregisterSubscriptionFromConnector(
	ctx context.Context,
	connection *db.Connection,
	connectorSubscriptionID uint,
) error {
	// Check if connector supports patch_event capability
	if !hasPatchEventCapability(&connection.Connector) {
		return nil
	}

	// Create system client
	systemClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		connection.Connector.SystemToken,
		"en",
	).WithConnectionID(connection.ID)

	// Initialize operation to get operation token
	operation, err := systemClient.InitOperation(ctx, connection.Details, connection.Settings)
	if err != nil {
		return fmt.Errorf("failed to initialize connector operation: %w", err)
	}

	// Create operation client
	opClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		operation.Token,
		"en",
	).WithConnectionID(connection.ID)

	// Unsubscribe from changes
	if unsubErr := opClient.UnsubscribeFromChanges(ctx, connectorSubscriptionID); unsubErr != nil {
		// Clean up operation even if unsubscribe fails
		_ = systemClient.CancelOperation(ctx, operation.ID)
		return fmt.Errorf("failed to unsubscribe from connector changes: %w", unsubErr)
	}

	// Clean up operation
	if cancelErr := systemClient.CancelOperation(ctx, operation.ID); cancelErr != nil {
		return fmt.Errorf("failed to cancel connector operation: %w", cancelErr)
	}

	return nil
}
