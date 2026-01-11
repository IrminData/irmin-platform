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
