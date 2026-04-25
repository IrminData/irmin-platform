package services

import (
	"context"
	"errors"
	"fmt"

	"irmin-api/connectorjobs"
	"irmin-api/db"

	"github.com/IrminData/irmin-sdk-go/connectorsclient"

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

// newSubscribeClient builds the SDK client used for
// subscribe/unsubscribe calls. Under the async protocol there is no
// separate operation token — the system token authenticates
// subscribe/unsubscribe directly, which the connectors service
// accepts once Phase 4 relaxes the OperationToken-only middleware on
// those routes.
func (s *ConnectionSubscriptionService) newSubscribeClient(connection *db.Connection) *connectorsclient.Client {
	return connectorjobs.NewConnectorClient(connection)
}

// RegisterSubscriptionWithConnector registers a subscription with the
// connector service. If the connector doesn't support patch_event
// capability, it returns ErrConnectorCapabilityNotSupported.
func (s *ConnectionSubscriptionService) RegisterSubscriptionWithConnector(
	ctx context.Context,
	connection *db.Connection,
	subscription *db.ConnectionSubscription,
	connectionSqid string,
) (*uint, error) {
	if !hasPatchEventCapability(&connection.Connector) {
		return nil, ErrConnectorCapabilityNotSupported
	}

	client := s.newSubscribeClient(connection)

	// Build webhook URL for this connection.
	// Format: {API_URL}/api/v1/webhooks/connectors/{connectionSqid}
	webhookURL := fmt.Sprintf("%s/api/v1/webhooks/connectors/%s", s.apiURL, connectionSqid)

	connectorSubscription, err := client.SubscribeToChanges(ctx, webhookURL, subscription.WebhookToken)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to connector changes: %w", err)
	}

	return &connectorSubscription.ID, nil
}

// UnregisterSubscriptionFromConnector removes a subscription from the
// connector service.
func (s *ConnectionSubscriptionService) UnregisterSubscriptionFromConnector(
	ctx context.Context,
	connection *db.Connection,
	connectorSubscriptionID uint,
) error {
	if !hasPatchEventCapability(&connection.Connector) {
		return nil
	}

	client := s.newSubscribeClient(connection)

	if unsubErr := client.UnsubscribeFromChanges(ctx, connectorSubscriptionID); unsubErr != nil {
		return fmt.Errorf("failed to unsubscribe from connector changes: %w", unsubErr)
	}

	return nil
}
