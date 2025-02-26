package irminCore

import (
	"fmt"
	"net/http"
	"net/url"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// ConnectionService handles operations related to connections
type ConnectionService struct {
	client *Client
}

// NewConnectionService creates a new instance of ConnectionService
func NewConnectionService(client *Client) *ConnectionService {
	return &ConnectionService{client: client}
}

// FetchConnections retrieves all connections for the current workspace
func (s *ConnectionService) FetchConnections() ([]irminModels.Connection, *irminModels.IrminAPIResponse, error) {
	var connections []irminModels.Connection
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/connections",
	}, &connections)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connections error: %w", err)
	}
	return connections, apiResp, nil
}

// FetchConnection retrieves a connection by its ID
func (s *ConnectionService) FetchConnection(connectionID string) (*irminModels.Connection, *irminModels.IrminAPIResponse, error) {
	var connection irminModels.Connection
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/connections/%s", connectionID),
	}, &connection)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection error: %w", err)
	}
	return &connection, apiResp, nil
}

// UpdateConnection updates an existing connection
func (s *ConnectionService) UpdateConnection(
	connectionID,
	name,
	description,
	documentation string,
) (*irminModels.Connection, *irminModels.IrminAPIResponse, error) {
	var updatedConnection irminModels.Connection
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connections/%s", connectionID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"_method":       "PATCH",
			"name":          name,
			"description":   description,
			"documentation": documentation,
		},
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("update connection error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// ReassignConnection reassigns a connection to a new owner
func (s *ConnectionService) ReassignConnection(
	connectionID, newOwnerID string,
) (*irminModels.Connection, *irminModels.IrminAPIResponse, error) {
	var updatedConnection irminModels.Connection
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connections/%s/reassign", connectionID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"owner": newOwnerID,
		},
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("reassign connection error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// DeleteConnection deletes a connection by its ID
func (s *ConnectionService) DeleteConnection(connectionID string) (*irminModels.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("_method", "DELETE")

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connections/%s", connectionID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"_method":    "DELETE",
			"connection": connectionID,
		},
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete connection error: %w", err)
	}
	return apiResp, nil
}

// CreateConnection creates a new connection with the provided details and settings
func (s *ConnectionService) CreateConnection(
	connectorID string,
	connectionDetails, connectionSettings map[string]string,
	name, description string,
) (*irminModels.Connection, *irminModels.IrminAPIResponse, error) {

	fields := map[string]string{
		"connector":   connectorID,
		"name":        name,
		"description": description,
	}
	for key, value := range connectionDetails {
		fields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range connectionSettings {
		fields[fmt.Sprintf("settings[%s]", key)] = value
	}

	var newConnection irminModels.Connection
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/connections",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  fields,
	}, &newConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("create connection error: %w", err)
	}
	return &newConnection, apiResp, nil
}
