package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateAIApplicationRequest represents the JSON request body for creating an AI application.
type CreateAIApplicationRequest struct {
	Name           string                                `json:"name"                   validate:"required,max=100"              example:"Customer Analytics App"`
	Description    string                                `json:"description"            validate:"max=500"                       example:"AI application for customer data analysis"`
	Documentation  string                                `json:"documentation"          validate:"validdocumentation"            example:"# Customer Analytics"`
	AllowedOrigins []string                              `json:"allowed_origins"        validate:"dive,max=255"                  example:"https://app.example.com,http://localhost:3000"`
	Tools          *irminmodels.AIApplicationToolConfig  `json:"tools,omitempty"`
	CustomTools    []CreateCustomToolRequest             `json:"custom_tools,omitempty" validate:"omitempty,dive"`
	DataSources    []irminmodels.AIApplicationDataSource `json:"data_sources"           validate:"dive"`
	Tags           []string                              `json:"tags,omitempty"         validate:"omitempty,dive,validsqid=tags" example:"tag_7k3m9x2n5q8p"`
}

// UpdateAIApplicationRequest represents the JSON request body for updating an AI application.
type UpdateAIApplicationRequest struct {
	Name           *string                               `json:"name,omitempty"            validate:"omitnil,max=100"               example:"Customer Analytics App"`
	Description    *string                               `json:"description,omitempty"     validate:"omitnil,max=500"               example:"AI application for customer data analysis"`
	Documentation  *string                               `json:"documentation,omitempty"   validate:"omitnil,validdocumentation"    example:"# Customer Analytics"`
	AllowedOrigins []string                              `json:"allowed_origins,omitempty" validate:"omitempty,dive,max=255"`
	Tools          *irminmodels.AIApplicationToolConfig  `json:"tools,omitempty"`
	CustomTools    []UpdateCustomToolRequest             `json:"custom_tools,omitempty"    validate:"omitempty,dive"`
	DataSources    []irminmodels.AIApplicationDataSource `json:"data_sources,omitempty"    validate:"omitempty,dive"`
	Tags           []string                              `json:"tags,omitempty"            validate:"omitempty,dive,validsqid=tags"`
}

// CreateCustomToolRequest represents the request body for creating a custom tool.
type CreateCustomToolRequest struct {
	Name        string                     `json:"name"        validate:"required,max=100,validtoolname"                        example:"list_users"`
	Description string                     `json:"description" validate:"max=500"                                               example:"List all users in the system"`
	Type        irminmodels.CustomToolType `json:"type"        validate:"required,oneof=stored_query workflow embedding_search" example:"stored_query"`
	Enabled     bool                       `json:"enabled"                                                                      example:"true"`

	// For stored_query type
	StoredQueryID *string `json:"stored_query_id,omitempty" validate:"omitempty,validsqid=queries" example:"qry_1a2b3c4d"`

	// For workflow type
	WorkflowID *string `json:"workflow_id,omitempty" validate:"omitempty,validsqid=workflows" example:"wf_1a2b3c4d"`

	// For embedding_search type
	EmbeddingPath   string            `json:"embedding_path,omitempty"   example:"/repo-slug/main/embeddings/docs.parquet"`
	EmbeddingTopK   int               `json:"embedding_top_k,omitempty"  example:"10"`
	EmbeddingFilter map[string]string `json:"embedding_filter,omitempty"`
}

// UpdateCustomToolRequest represents the request body for updating a custom tool.
// If ID is provided, the tool is updated; otherwise, a new tool is created.
type UpdateCustomToolRequest struct {
	ID          *string                    `json:"id,omitempty" validate:"omitempty,validsqid=ai_application_custom_tools"`
	Name        string                     `json:"name"         validate:"required,max=100,validtoolname"                        example:"list_users"`
	Description string                     `json:"description"  validate:"max=500"                                               example:"List all users in the system"`
	Type        irminmodels.CustomToolType `json:"type"         validate:"required,oneof=stored_query workflow embedding_search" example:"stored_query"`
	Enabled     bool                       `json:"enabled"                                                                       example:"true"`

	// For stored_query type
	StoredQueryID *string `json:"stored_query_id,omitempty" validate:"omitempty,validsqid=queries" example:"qry_1a2b3c4d"`

	// For workflow type
	WorkflowID *string `json:"workflow_id,omitempty" validate:"omitempty,validsqid=workflows" example:"wf_1a2b3c4d"`

	// For embedding_search type
	EmbeddingPath   string            `json:"embedding_path,omitempty"   example:"/repo-slug/main/embeddings/docs.parquet"`
	EmbeddingTopK   int               `json:"embedding_top_k,omitempty"  example:"10"`
	EmbeddingFilter map[string]string `json:"embedding_filter,omitempty"`
}

// TransferAIApplicationOwnershipRequest represents the JSON request body for transferring AI application ownership.
type TransferAIApplicationOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

// ListAIApplications retrieves all AI applications in a workspace.
func (c *Client) ListAIApplications(
	ctx context.Context,
	workspace string,
) ([]irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplications []irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/ai-applications", workspace),
	}, &aiApplications)
	if err != nil {
		return nil, nil, fmt.Errorf("list AI applications error: %w", err)
	}
	return aiApplications, apiResp, nil
}

// GetAIApplication retrieves a specific AI application by ID.
func (c *Client) GetAIApplication(
	ctx context.Context,
	workspace, aiApplicationID string,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s", workspace, aiApplicationID),
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("get AI application error: %w", err)
	}
	return &aiApplication, apiResp, nil
}

// CreateAIApplication creates a new AI application.
func (c *Client) CreateAIApplication(
	ctx context.Context,
	workspace string,
	req CreateAIApplicationRequest,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/ai-applications", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("create AI application error: %w", err)
	}
	return &aiApplication, apiResp, nil
}

// UpdateAIApplication updates an existing AI application.
func (c *Client) UpdateAIApplication(
	ctx context.Context,
	workspace, aiApplicationID string,
	req UpdateAIApplicationRequest,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s", workspace, aiApplicationID),
		ContentType: "application/json",
		Body:        req,
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("update AI application error: %w", err)
	}
	return &aiApplication, apiResp, nil
}

// DeleteAIApplication deletes an AI application.
func (c *Client) DeleteAIApplication(
	ctx context.Context,
	workspace, aiApplicationID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s", workspace, aiApplicationID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete AI application error: %w", err)
	}
	return apiResp, nil
}

// TransferAIApplication transfers ownership of an AI application to another user.
func (c *Client) TransferAIApplication(
	ctx context.Context,
	workspace, aiApplicationID, newOwnerID string,
) (*irminmodels.AIApplication, *irminmodels.IrminAPIResponse, error) {
	var aiApplication irminmodels.AIApplication
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s/transfer-ownership", workspace, aiApplicationID),
		ContentType: "application/json",
		Body:        TransferAIApplicationOwnershipRequest{NewOwnerID: newOwnerID},
	}, &aiApplication)
	if err != nil {
		return nil, nil, fmt.Errorf("AI application ownership transfer error: %w", err)
	}
	return &aiApplication, apiResp, nil
}

// GetAIApplicationPendingWritesOptions contains optional parameters for fetching pending writes.
type GetAIApplicationPendingWritesOptions struct {
	Limit  int
	Offset int
}

// GetAIApplicationPendingWrites retrieves pending write operations for an AI application.
func (c *Client) GetAIApplicationPendingWrites(
	ctx context.Context,
	workspace, aiApplicationID string,
	opts *GetAIApplicationPendingWritesOptions,
) (*irminmodels.AIApplicationPendingWritesResponse, *irminmodels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/ai-applications/%s/pending-writes",
		workspace,
		aiApplicationID,
	)

	params := url.Values{}
	if opts != nil {
		if opts.Limit > 0 {
			params.Set("limit", strconv.Itoa(opts.Limit))
		}
		if opts.Offset > 0 {
			params.Set("offset", strconv.Itoa(opts.Offset))
		}
	}
	if len(params) > 0 {
		endpoint += "?" + params.Encode()
	}

	var response irminmodels.AIApplicationPendingWritesResponse
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &response)
	if err != nil {
		return nil, nil, fmt.Errorf("get AI application pending writes error: %w", err)
	}
	return &response, apiResp, nil
}

// GetAIApplicationPendingWrite retrieves a specific pending write by ID.
func (c *Client) GetAIApplicationPendingWrite(
	ctx context.Context,
	workspace, aiApplicationID, pendingWriteID string,
) (*irminmodels.AIApplicationPendingWrite, *irminmodels.IrminAPIResponse, error) {
	var pendingWrite irminmodels.AIApplicationPendingWrite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/ai-applications/%s/pending-writes/%s",
			workspace,
			aiApplicationID,
			pendingWriteID,
		),
	}, &pendingWrite)
	if err != nil {
		return nil, nil, fmt.Errorf("get AI application pending write error: %w", err)
	}
	return &pendingWrite, apiResp, nil
}

// ApproveAIApplicationPendingWrite approves a pending write operation.
func (c *Client) ApproveAIApplicationPendingWrite(
	ctx context.Context,
	workspace, aiApplicationID, pendingWriteID string,
) (*irminmodels.AIApplicationPendingWrite, *irminmodels.IrminAPIResponse, error) {
	var pendingWrite irminmodels.AIApplicationPendingWrite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/ai-applications/%s/pending-writes/%s/approve",
			workspace,
			aiApplicationID,
			pendingWriteID,
		),
	}, &pendingWrite)
	if err != nil {
		return nil, nil, fmt.Errorf("approve AI application pending write error: %w", err)
	}
	return &pendingWrite, apiResp, nil
}

// RejectAIApplicationPendingWrite rejects a pending write operation.
func (c *Client) RejectAIApplicationPendingWrite(
	ctx context.Context,
	workspace, aiApplicationID, pendingWriteID string,
) (*irminmodels.AIApplicationPendingWrite, *irminmodels.IrminAPIResponse, error) {
	var pendingWrite irminmodels.AIApplicationPendingWrite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/ai-applications/%s/pending-writes/%s/reject",
			workspace,
			aiApplicationID,
			pendingWriteID,
		),
	}, &pendingWrite)
	if err != nil {
		return nil, nil, fmt.Errorf("reject AI application pending write error: %w", err)
	}
	return &pendingWrite, apiResp, nil
}

// GetAIApplicationToolLogsOptions contains optional parameters for fetching tool logs.
type GetAIApplicationToolLogsOptions struct {
	Limit    int
	Offset   int
	ToolName string
	Success  *bool
}

// GetAIApplicationToolLogs retrieves tool call audit logs for an AI application.
func (c *Client) GetAIApplicationToolLogs(
	ctx context.Context,
	workspace, aiApplicationID string,
	opts *GetAIApplicationToolLogsOptions,
) (*irminmodels.AIApplicationToolLogsResponse, *irminmodels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s/tool-logs", workspace, aiApplicationID)

	// Build query parameters
	params := url.Values{}
	if opts != nil {
		if opts.Limit > 0 {
			params.Set("limit", strconv.Itoa(opts.Limit))
		}
		if opts.Offset > 0 {
			params.Set("offset", strconv.Itoa(opts.Offset))
		}
		if opts.ToolName != "" {
			params.Set("tool_name", opts.ToolName)
		}
		if opts.Success != nil {
			params.Set("success", strconv.FormatBool(*opts.Success))
		}
	}

	// Append query parameters to endpoint
	if len(params) > 0 {
		endpoint += "?" + params.Encode()
	}

	var logsResponse irminmodels.AIApplicationToolLogsResponse
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &logsResponse)
	if err != nil {
		return nil, nil, fmt.Errorf("get AI application tool logs error: %w", err)
	}
	return &logsResponse, apiResp, nil
}

// GetAIApplicationToolLogStats retrieves aggregated statistics for tool calls.
func (c *Client) GetAIApplicationToolLogStats(
	ctx context.Context,
	workspace, aiApplicationID string,
) (*irminmodels.AIApplicationToolLogStats, *irminmodels.IrminAPIResponse, error) {
	var stats irminmodels.AIApplicationToolLogStats
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/ai-applications/%s/tool-logs/stats", workspace, aiApplicationID),
	}, &stats)
	if err != nil {
		return nil, nil, fmt.Errorf("get AI application tool log stats error: %w", err)
	}
	return &stats, apiResp, nil
}
