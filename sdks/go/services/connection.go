package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
	"net/url"
	"strings"
)

// ConnectionService handles operations related to connections
type ConnectionService struct {
	client *client.Client
}

// NewConnectionService creates a new instance of ConnectionService
func NewConnectionService(client *client.Client) *ConnectionService {
	return &ConnectionService{client: client}
}

// FetchConnections retrieves all connections for the current workspace
func (s *ConnectionService) FetchConnections() ([]models.Connection, *client.IrminAPIResponse, error) {
	var connections []models.Connection
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/connections",
	}, &connections)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connections error: %w", err)
	}
	return connections, apiResp, nil
}

// FetchConnection retrieves a connection by its ID
func (s *ConnectionService) FetchConnection(connectionID string) (*models.Connection, *client.IrminAPIResponse, error) {
	var connection models.Connection
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
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
	connectionID string,
	data map[string]interface{},
) (*models.Connection, *client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("_method", "PATCH")
	for key, value := range data {
		form.Set(key, fmt.Sprintf("%v", value))
	}

	var updatedConnection models.Connection
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connections/%s", connectionID),
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("update connection error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// ReassignConnection reassigns a connection to a new owner
func (s *ConnectionService) ReassignConnection(
	connectionID, newOwnerID string,
) (*models.Connection, *client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("owner", newOwnerID)

	var updatedConnection models.Connection
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connections/%s/reassign", connectionID),
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("reassign connection error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// DeleteConnection deletes a connection by its ID
func (s *ConnectionService) DeleteConnection(connectionID string) (*client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("_method", "DELETE")
	form.Set("connection", connectionID)

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/connections",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
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
) (*models.Connection, *client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("connector", connectorID)
	form.Set("name", name)
	form.Set("description", description)

	for key, value := range connectionDetails {
		form.Set(fmt.Sprintf("details[%s]", key), value)
	}
	for key, value := range connectionSettings {
		form.Set(fmt.Sprintf("settings[%s]", key), value)
	}

	var newConnection models.Connection
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/connections",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &newConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("create connection error: %w", err)
	}
	return &newConnection, apiResp, nil
}
