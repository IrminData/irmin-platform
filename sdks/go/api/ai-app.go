package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// === Request Types ===

// AIAppQueryRequest represents the request body for executing SQL queries.
type AIAppQueryRequest struct {
	SQL string `json:"sql" validate:"required" example:"SELECT * FROM $['data-source;file.json'] LIMIT 10"`
}

// AIAppSearchEmbeddingsRequest represents the request body for searching embeddings.
type AIAppSearchEmbeddingsRequest struct {
	Query  string            `json:"query"  validate:"required" example:"What is machine learning?"`
	Path   string            `json:"path"                       example:"/data-source/embeddings/docs.parquet"` // Optional: filter to specific embedding file
	TopK   int               `json:"top_k"                      example:"10"`                                   // Optional: defaults to 10
	Filter map[string]string `json:"filter"`                                                                    // Optional: metadata filter
}

// === Response Types ===

// AIAppInfo represents information about an AI Application.
type AIAppInfo struct {
	Name        string                               `json:"name"`
	Description string                               `json:"description"`
	Workspace   string                               `json:"workspace"`
	Tools       irminmodels.AIApplicationToolConfig  `json:"tools"`
	DataSources []irminmodels.AIAppDataSourceUnified `json:"data_sources"`
}

// AIAppContent represents the content of a data object.
type AIAppContent struct {
	Content       string `json:"content,omitempty"`        // Text content (for text/json files)
	ContentBase64 string `json:"content_base64,omitempty"` // Base64 encoded content (for binary files)
	MimeType      string `json:"mime_type"`
}

// AIAppSystemPrompt represents the system prompt response.
type AIAppSystemPrompt struct {
	SystemPrompt string `json:"system_prompt"`
}

// === API Methods ===

// GetInfo retrieves information about the AI Application.
func (c *AIAppClient) GetInfo(ctx context.Context) (*AIAppInfo, *irminmodels.IrminAPIResponse, error) {
	var info AIAppInfo
	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/ai-app/info",
	}, &info)
	if err != nil {
		return nil, apiResp, fmt.Errorf("get AI app info error: %w", err)
	}
	return &info, apiResp, nil
}

// GetSystemPrompt retrieves the recommended system prompt for the AI Application.
func (c *AIAppClient) GetSystemPrompt(ctx context.Context) (string, *irminmodels.IrminAPIResponse, error) {
	var result AIAppSystemPrompt
	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/ai-app/system-prompt",
	}, &result)
	if err != nil {
		return "", apiResp, fmt.Errorf("get system prompt error: %w", err)
	}
	return result.SystemPrompt, apiResp, nil
}

// Query executes a SQL query within the AI Application's data scope.
func (c *AIAppClient) Query(
	ctx context.Context,
	req AIAppQueryRequest,
) (any, *irminmodels.IrminAPIResponse, error) {
	var result any
	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/ai-app/query",
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("query error: %w", err)
	}
	return result, apiResp, nil
}

// ListObjects lists objects at the specified path.
// If path is empty, lists all data source roots.
func (c *AIAppClient) ListObjects(
	ctx context.Context,
	path string,
) (*irminmodels.Object, *irminmodels.IrminAPIResponse, error) {
	var object irminmodels.Object

	endpoint := "/v1/ai-app/objects"
	if path != "" {
		endpoint = fmt.Sprintf("%s?path=%s", endpoint, url.QueryEscape(path))
	}

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &object)
	if err != nil {
		return nil, apiResp, fmt.Errorf("list objects error: %w", err)
	}
	return &object, apiResp, nil
}

// GetContent retrieves the content of an object at the specified path.
func (c *AIAppClient) GetContent(
	ctx context.Context,
	path string,
) (*AIAppContent, *irminmodels.IrminAPIResponse, error) {
	var content AIAppContent

	endpoint := fmt.Sprintf("/v1/ai-app/content?path=%s", url.QueryEscape(path))

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &content)
	if err != nil {
		return nil, apiResp, fmt.Errorf("get content error: %w", err)
	}
	return &content, apiResp, nil
}

// GetSchema retrieves the schema of an object at the specified path.
func (c *AIAppClient) GetSchema(
	ctx context.Context,
	path string,
) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var schema irminmodels.ObjectSchema

	endpoint := fmt.Sprintf("/v1/ai-app/schema?path=%s", url.QueryEscape(path))

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &schema)
	if err != nil {
		return nil, apiResp, fmt.Errorf("get schema error: %w", err)
	}
	return &schema, apiResp, nil
}

// SearchEmbeddings performs vector similarity search.
// If path is empty, searches across all embedding files in data sources.
func (c *AIAppClient) SearchEmbeddings(
	ctx context.Context,
	req AIAppSearchEmbeddingsRequest,
) (*irminmodels.EmbeddingSearchResponse, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.EmbeddingSearchResponse

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/ai-app/embeddings/search",
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("search embeddings error: %w", err)
	}
	return &result, apiResp, nil
}

// === Custom Tool Types ===

// CustomToolInfo represents information about a custom tool.
type CustomToolInfo struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Type          string `json:"type"`
	RequiresQuery bool   `json:"requires_query,omitempty"`
}

// CustomToolsListResponse represents the response from listing custom tools.
type CustomToolsListResponse struct {
	Tools []CustomToolInfo `json:"tools"`
}

// CustomToolResult represents the result of executing a custom tool.
type CustomToolResult struct {
	ToolName string `json:"tool_name"`
	ToolType string `json:"tool_type"`
	Data     any    `json:"data"`
}

// ExecuteCustomToolRequest represents the request body for executing a custom tool.
type ExecuteCustomToolRequest struct {
	Query string `json:"query,omitempty"` // Required for embedding_search tools
}

// === Custom Tool API Methods ===

// ListCustomTools retrieves all enabled custom tools for the AI Application.
func (c *AIAppClient) ListCustomTools(
	ctx context.Context,
) ([]CustomToolInfo, *irminmodels.IrminAPIResponse, error) {
	var result CustomToolsListResponse

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/ai-app/tools",
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("list custom tools error: %w", err)
	}
	return result.Tools, apiResp, nil
}

// ExecuteCustomTool executes a custom tool by name.
// For embedding_search tools, provide the query in the request.
func (c *AIAppClient) ExecuteCustomTool(
	ctx context.Context,
	toolName string,
	req ExecuteCustomToolRequest,
) (*CustomToolResult, *irminmodels.IrminAPIResponse, error) {
	var result CustomToolResult

	endpoint := fmt.Sprintf("/v1/ai-app/tools/%s/execute", url.PathEscape(toolName))

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("execute custom tool error: %w", err)
	}
	return &result, apiResp, nil
}

// === Write Operation Types ===

// AIAppWriteFileRequest represents the request body for writing a file.
type AIAppWriteFileRequest struct {
	Path          string `json:"path"                     validate:"required" example:"/repo-slug/main/data/file.json"`
	Content       string `json:"content,omitempty"`
	ContentBase64 string `json:"content_base64,omitempty"`
	CommitMessage string `json:"commit_message,omitempty"                     example:"Updated customer data"`
	AutoCommit    bool   `json:"auto_commit"                                  example:"true"`
}

// AIAppPatchFileRequest represents the request body for patching a file with JSON Patch operations.
type AIAppPatchFileRequest struct {
	Path          string                       `json:"path"                     validate:"required" example:"/repo-slug/main/data/file.json"`
	Operations    []irminmodels.PatchOperation `json:"operations"               validate:"required"`
	CommitMessage string                       `json:"commit_message,omitempty"                     example:"Patched customer records"`
	AutoCommit    bool                         `json:"auto_commit"                                  example:"true"`
}

// AIAppCommitRequest represents the request body for committing staged changes.
type AIAppCommitRequest struct {
	Path    string `json:"path,omitempty" example:"/repo-slug/main"`
	Message string `json:"message"        example:"AI agent updates" validate:"required"`
}

// AIAppWriteResult represents the result of a write operation.
type AIAppWriteResult struct {
	Path             string  `json:"path"                 example:"/repo-slug/main/data/file.json"`
	Operation        string  `json:"operation"            example:"upload"`
	Committed        bool    `json:"committed"            example:"true"`
	CommitID         *string `json:"commit_id,omitempty"  example:"abc123def456"`
	PendingID        *string `json:"pending_id,omitempty" example:"pw_1a2b3c4d"`
	RequiresApproval bool    `json:"requires_approval"    example:"false"`
}

// === Write Operation API Methods ===

// WriteFile writes or updates a file at the specified path.
// The path should be in unified format: /repo-slug/ref/path/to/file.json
func (c *AIAppClient) WriteFile(
	ctx context.Context,
	req AIAppWriteFileRequest,
) (*AIAppWriteResult, *irminmodels.IrminAPIResponse, error) {
	var result AIAppWriteResult

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/ai-app/write",
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("write file error: %w", err)
	}
	return &result, apiResp, nil
}

// PatchFile applies JSON Patch operations to a file at the specified path.
// The path should be in unified format: /repo-slug/ref/path/to/file.json
func (c *AIAppClient) PatchFile(
	ctx context.Context,
	req AIAppPatchFileRequest,
) (*AIAppWriteResult, *irminmodels.IrminAPIResponse, error) {
	var result AIAppWriteResult

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/ai-app/patch",
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("patch file error: %w", err)
	}
	return &result, apiResp, nil
}

// CommitChanges commits all staged changes on the specified branch.
// If path is empty, commits changes across all data sources.
func (c *AIAppClient) CommitChanges(
	ctx context.Context,
	req AIAppCommitRequest,
) (*AIAppWriteResult, *irminmodels.IrminAPIResponse, error) {
	var result AIAppWriteResult

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/ai-app/commit",
		ContentType: "application/json",
		Body:        req,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("commit changes error: %w", err)
	}
	return &result, apiResp, nil
}

// === Pending Writes API Methods ===

// ListPendingWrites retrieves all pending write operations awaiting approval.
func (c *AIAppClient) ListPendingWrites(
	ctx context.Context,
	limit, offset int,
) (*irminmodels.AIApplicationPendingWritesResponse, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.AIApplicationPendingWritesResponse

	endpoint := fmt.Sprintf("/v1/ai-app/pending-writes?limit=%d&offset=%d", limit, offset)

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("list pending writes error: %w", err)
	}
	return &result, apiResp, nil
}

// GetPendingWrite retrieves a specific pending write by ID.
func (c *AIAppClient) GetPendingWrite(
	ctx context.Context,
	pendingWriteID string,
) (*irminmodels.AIApplicationPendingWrite, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.AIApplicationPendingWrite

	endpoint := fmt.Sprintf("/v1/ai-app/pending-writes/%s", url.PathEscape(pendingWriteID))

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("get pending write error: %w", err)
	}
	return &result, apiResp, nil
}

// ApprovePendingWrite approves a pending write operation, executing the write.
func (c *AIAppClient) ApprovePendingWrite(
	ctx context.Context,
	pendingWriteID string,
) (*AIAppWriteResult, *irminmodels.IrminAPIResponse, error) {
	var result AIAppWriteResult

	endpoint := fmt.Sprintf("/v1/ai-app/pending-writes/%s/approve", url.PathEscape(pendingWriteID))

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodPost,
		Endpoint: endpoint,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("approve pending write error: %w", err)
	}
	return &result, apiResp, nil
}

// RejectPendingWrite rejects a pending write operation.
func (c *AIAppClient) RejectPendingWrite(
	ctx context.Context,
	pendingWriteID string,
) (*irminmodels.AIApplicationPendingWrite, *irminmodels.IrminAPIResponse, error) {
	var result irminmodels.AIApplicationPendingWrite

	endpoint := fmt.Sprintf("/v1/ai-app/pending-writes/%s/reject", url.PathEscape(pendingWriteID))

	apiResp, err := c.FetchAPI(ctx, AIAppRequestOptions{
		Method:   http.MethodPost,
		Endpoint: endpoint,
	}, &result)
	if err != nil {
		return nil, apiResp, fmt.Errorf("reject pending write error: %w", err)
	}
	return &result, apiResp, nil
}
