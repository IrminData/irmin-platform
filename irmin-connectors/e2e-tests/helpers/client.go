package helpers

import (
	"context"
	"net/http"
	"time"

	connectorsclient "irmin-connectors/e2e-tests/connectors-client"
)

// ConnectorClient wraps the connector client with test-specific functionality.
type ConnectorClient struct {
	*connectorsclient.Client
	ConnectorName string
	URL           string
	SystemToken   string
}

// NewConnectorClient creates a new connector client for testing.
func NewConnectorClient(connectorName, url, systemToken string) *ConnectorClient {
	return &ConnectorClient{
		Client:        connectorsclient.NewClient(url, systemToken),
		ConnectorName: connectorName,
		URL:           url,
		SystemToken:   systemToken,
	}
}

// WithOperationToken creates a new client with an operation token instead of system token.
func (c *ConnectorClient) WithOperationToken(operationToken string) *ConnectorClient {
	return &ConnectorClient{
		Client:        connectorsclient.NewClient(c.URL, operationToken),
		ConnectorName: c.ConnectorName,
		URL:           c.URL,
		SystemToken:   c.SystemToken,
	}
}

// SetTimeout updates the HTTP client timeout.
func (c *ConnectorClient) SetTimeout(timeout time.Duration) {
	c.Client.HTTPClient = &http.Client{
		Timeout: timeout,
	}
}

// GetInfoWithContext is a context-aware wrapper for GetInfo.
func (c *ConnectorClient) GetInfoWithContext(ctx context.Context) (*connectorsclient.ConnectorInfo, error) {
	return c.Client.GetInfo(ctx)
}
