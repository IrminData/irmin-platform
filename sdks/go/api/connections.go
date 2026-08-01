package irmincore

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CreateConnectionRequest represents the JSON request body for creating connections.
type CreateConnectionRequest struct {
	Name          string         `json:"name"                    validate:"required,max=100"              example:"Production MySQL Database"`
	Connector     string         `json:"connector"               validate:"required,validsqid=connectors" example:"conn_5p8q2n7m9x4k"`
	Description   string         `json:"description,omitempty"   validate:"max=500"                       example:"Primary MySQL database for production customer data"`
	Documentation string         `json:"documentation,omitempty" validate:"validdocumentation"            example:"# Production Database"`
	Details       map[string]any `json:"details"`  // Values for the required connector configuration as JSON object, like {"host":"db.example.com"}
	Settings      map[string]any `json:"settings"` // Values for the optional connector configuration as JSON object, like {"ssl_enabled":"true"}
	Tags          []string       `json:"tags,omitempty"          validate:"omitempty,dive,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
}

// UpdateConnectionRequest represents the JSON request body for updating connections.
type UpdateConnectionRequest struct {
	Name          *string `json:"name,omitempty"          validate:"omitnil,max=100"            example:"Production MySQL Database"`
	Description   *string `json:"description,omitempty"   validate:"omitnil,max=500"            example:"Primary MySQL database for production customer data"`
	Documentation *string `json:"documentation,omitempty" validate:"omitnil,validdocumentation" example:"# Production Database"`
}

// UpdateConnectionConfigurationRequest represents the JSON request body for updating connection configuration.
type UpdateConnectionConfigurationRequest struct {
	Details  map[string]any `json:"details"`
	Settings map[string]any `json:"settings"`
}

// TransferConnectionOwnershipRequest represents the JSON request body for transferring connection ownership.
type TransferConnectionOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

func (c *Client) ListConnections(
	ctx context.Context,
	workspace string,
) ([]irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var connections []irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/connections", workspace),
	}, &connections)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connections error: %w", err)
	}
	return connections, apiResp, nil
}

func (c *Client) GetConnection(
	ctx context.Context,
	workspace, connectionID string,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var connection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
	}, &connection)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection error: %w", err)
	}
	return &connection, apiResp, nil
}

func (c *Client) CreateConnection(
	ctx context.Context,
	workspace string,
	req CreateConnectionRequest,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var newConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &newConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("create connection error: %w", err)
	}
	return &newConnection, apiResp, nil
}

func (c *Client) UpdateConnection(
	ctx context.Context,
	workspace, connectionID string,
	req UpdateConnectionRequest,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var updatedConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
		ContentType: "application/json",
		Body:        req,
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("update connection error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

func (c *Client) UpdateConnectionConfiguration(
	ctx context.Context,
	workspace, connectionID string,
	req UpdateConnectionConfigurationRequest,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var updatedConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s/configuration", workspace, connectionID),
		ContentType: "application/json",
		Body:        req,
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("update connection configuration error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// TransferConnection reassigns a connection to a new owner.
func (c *Client) TransferConnection(
	ctx context.Context,
	workspace, connectionID string,
	req TransferConnectionOwnershipRequest,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var updatedConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s/transfer-ownership", workspace, connectionID),
		ContentType: "application/json",
		Body:        req,
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("connection ownership transfer error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// DeleteConnection deletes a connection by its ID.
func (c *Client) DeleteConnection(
	ctx context.Context,
	workspace, connectionID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
		ContentType: "application/json",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete connection error: %w", err)
	}
	return apiResp, nil
}

// GetConnectionSchema retrieves the schema for a specific connection and operation method.
func (c *Client) GetConnectionSchema(
	ctx context.Context,
	workspace, connectionID, operationMethod, path string,
) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var connectionSchema irminmodels.ObjectSchema
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/schema?operation_method=%s&path=%s",
			workspace,
			connectionID,
			operationMethod,
			path,
		),
	}, &connectionSchema)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection schema error: %w", err)
	}
	return &connectionSchema, apiResp, nil
}

// TestConnection tests the connection with the provided configuration.
func (c *Client) TestConnection(
	ctx context.Context,
	workspace, connectionID string,
) (*irminmodels.ConnectorConfigurationValidationResult, *irminmodels.IrminAPIResponse, error) {
	var validationResult irminmodels.ConnectorConfigurationValidationResult
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/connections/%s/test", workspace, connectionID),
	}, &validationResult)
	if err != nil {
		return nil, nil, fmt.Errorf("test connection error: %w", err)
	}
	return &validationResult, apiResp, nil
}

// ValidateSchemaFile represents a file to be validated against a connection schema.
type ValidateSchemaFile struct {
	// FileName is the name of the file (used for matching against group schema children).
	FileName string
	// Content is the file content as bytes.
	Content []byte
}

// ValidateSchema validates data files against a connection's schema.
//
// For group schemas (schemas with multiple children like "users.json", "orders.json"),
// files are automatically matched to child schemas by filename (case-insensitive).
// For single schemas, all files are validated against the same schema.
//
// Parameters:
//   - workspace: The workspace slug
//   - connectionID: The connection's identifier
//   - operationMethod: The operation method ("push" or "pull")
//   - path: Optional path within the connection schema (empty string for root)
//   - files: Files to validate (map of filename to content)
//
// The auto-matching logic works as follows:
//   - If the target schema is a group, each file is matched by name to a child schema
//   - Files that don't match any child schema will generate a warning
//   - If the target schema is not a group, all files validate against it
func (c *Client) ValidateSchema(
	ctx context.Context,
	workspace, connectionID, operationMethod, path string,
	files []ValidateSchemaFile,
) (*irminmodels.SchemaValidationResult, *irminmodels.IrminAPIResponse, error) {
	// Build query parameters
	params := url.Values{}
	params.Set("operation_method", operationMethod)
	if path != "" {
		params.Set("path", path)
	}

	// Convert files to FormFile slice
	formFiles := make([]FormFile, 0, len(files))
	for _, f := range files {
		formFiles = append(formFiles, FormFile{
			FieldName: "files",
			FileName:  f.FileName,
			Reader:    bytes.NewReader(f.Content),
		})
	}

	var result irminmodels.SchemaValidationResult
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/schema/validate?%s",
			workspace,
			connectionID,
			params.Encode(),
		),
		ContentType: "multipart/form-data",
		Files:       formFiles,
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("validate schema error: %w", err)
	}
	return &result, apiResp, nil
}

// DiffSchema compares the schema of uploaded data against the connection's expected schema.
//
// This is useful for detecting schema drift or understanding what changes would be
// needed to make data compatible with a connection's schema.
//
// Parameters:
//   - workspace: The workspace slug
//   - connectionID: The connection's identifier
//   - operationMethod: The operation method ("push" or "pull")
//   - path: Optional path within the connection schema (empty string for root)
//   - file: The file to compare schema for
//
// Returns a SchemaDiff containing:
//   - Whether schemas are compatible
//   - Breaking changes (would cause validation failures)
//   - Non-breaking changes (additive changes, type widenings)
func (c *Client) DiffSchema(
	ctx context.Context,
	workspace, connectionID, operationMethod, path string,
	file ValidateSchemaFile,
) (*irminmodels.SchemaDiff, *irminmodels.IrminAPIResponse, error) {
	// Build query parameters
	params := url.Values{}
	params.Set("operation_method", operationMethod)
	if path != "" {
		params.Set("path", path)
	}

	formFiles := []FormFile{
		{
			FieldName: "file",
			FileName:  file.FileName,
			Reader:    bytes.NewReader(file.Content),
		},
	}

	var result irminmodels.SchemaDiff
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/schema/diff?%s",
			workspace,
			connectionID,
			params.Encode(),
		),
		ContentType: "multipart/form-data",
		Files:       formFiles,
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("diff schema error: %w", err)
	}
	return &result, apiResp, nil
}
