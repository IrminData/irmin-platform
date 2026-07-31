package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// VectorizeObjectsRequest represents the JSON request body for vectorizing repository objects.
type VectorizeObjectsRequest struct {
	SourcePaths []string                     `json:"source_paths" validate:"required,min=1,dive,required" example:"data/documents/doc1.pdf"`      // List of source file paths to vectorize
	OutputPath  string                       `json:"output_path"  validate:"required"                     example:"embeddings/documents.parquet"` // Output path for the embedding file
	Ref         string                       `json:"ref"          validate:"omitempty,max=100"            example:"main"`                         // Repository reference (branch/tag/commit)
	Config      *irminmodels.EmbeddingConfig `json:"config"       validate:"omitempty"`                                                           // Optional embedding configuration
}

// SearchEmbeddingsRequest represents the JSON request body for searching embeddings.
type SearchEmbeddingsRequest struct {
	Query          string            `json:"query"           validate:"required"             example:"What is machine learning?"`    // Query text to search for
	EmbeddingPath  string            `json:"embedding_path"  validate:"required"             example:"embeddings/documents.parquet"` // Path to the embedding file
	Ref            string            `json:"ref"             validate:"omitempty,max=100"    example:"main"`                         // Repository reference (branch/tag/commit)
	TopK           int               `json:"top_k"           validate:"omitempty,min=1"      example:"10"`                           // Number of results to return (default: 10)
	Filter         map[string]string `json:"filter"          validate:"omitempty"`                                                   // Optional metadata filters
	PriorityWeight *float64          `json:"priority_weight" validate:"omitempty,gt=0,max=1" example:"0.5"`                          // Priority weighting factor (>0 to 1, default: disabled)
}

// ListEmbeddingsRequest represents query parameters for listing embedding files.
type ListEmbeddingsRequest struct {
	Prefix string `json:"prefix" validate:"omitempty"         example:"embeddings/"` // Optional prefix to filter embedding files
	Ref    string `json:"ref"    validate:"omitempty,max=100" example:"main"`        // Repository reference (branch/tag/commit)
}

// GetEmbeddingInfoRequest represents query parameters for getting embedding file info.
type GetEmbeddingInfoRequest struct {
	EmbeddingPath string `json:"embedding_path" validate:"required"          example:"embeddings/documents.parquet"` // Path to the embedding file
	Ref           string `json:"ref"            validate:"omitempty,max=100" example:"main"`                         // Repository reference (branch/tag/commit)
}

// UpsertEmbeddingsRequest represents the request to upsert embeddings with deduplication.
type UpsertEmbeddingsRequest struct {
	SourcePaths []string                          `json:"source_paths,omitempty" validate:"omitempty,dive,required"` // Source file paths to vectorize
	Embeddings  []irminmodels.UpsertEmbeddingItem `json:"embeddings,omitempty"   validate:"omitempty,dive"`          // Pre-defined embeddings to upsert
	OutputPath  string                            `json:"output_path"            validate:"required"`
	Ref         string                            `json:"ref,omitempty"          validate:"omitempty,max=100"`
	Config      *irminmodels.EmbeddingConfig      `json:"config,omitempty"`
	Metadata    map[string]string                 `json:"metadata,omitempty"`                                      // Default metadata for all chunks
	Priority    *float64                          `json:"priority,omitempty"     validate:"omitempty,min=0,max=1"` // Default priority (pointer to allow 0)
}

// UpdateEmbeddingMetadataRequest represents the request to update embedding metadata.
type UpdateEmbeddingMetadataRequest struct {
	EmbeddingPath string                       `json:"embedding_path" validate:"required"`          // Path to embedding file
	Ref           string                       `json:"ref,omitempty"  validate:"omitempty,max=100"` // Repository reference
	Updates       map[string]map[string]string `json:"updates"        validate:"required"`          // ID -> metadata map
}

// UpdateEmbeddingPriorityRequest represents the request to update embedding priority.
type UpdateEmbeddingPriorityRequest struct {
	EmbeddingPath string             `json:"embedding_path" validate:"required"`                  // Path to embedding file
	Ref           string             `json:"ref,omitempty"  validate:"omitempty,max=100"`         // Repository reference
	Updates       map[string]float64 `json:"updates"        validate:"required,dive,min=0,max=1"` // ID -> priority map (values must be 0.0-1.0)
}

// VectorizeObjects creates embeddings from one or more repository objects.
func (c *Client) VectorizeObjects(
	ctx context.Context,
	workspace, repository string,
	req VectorizeObjectsRequest,
) (*irminmodels.EmbeddingFile, *irminmodels.IrminAPIResponse, error) {
	var embeddingFile irminmodels.EmbeddingFile
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/embeddings/vectorize",
			workspace,
			repository,
		),
		ContentType: "application/json",
		Body:        req,
	}, &embeddingFile)
	if err != nil {
		return nil, nil, fmt.Errorf("vectorize objects error: %w", err)
	}
	return &embeddingFile, apiResp, nil
}

// SearchEmbeddings performs vector similarity search on an embedding file.
func (c *Client) SearchEmbeddings(
	ctx context.Context,
	workspace, repository string,
	req SearchEmbeddingsRequest,
) (*irminmodels.EmbeddingSearchResponse, *irminmodels.IrminAPIResponse, error) {
	var searchResponse irminmodels.EmbeddingSearchResponse
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/embeddings/search",
			workspace,
			repository,
		),
		ContentType: "application/json",
		Body:        req,
	}, &searchResponse)
	if err != nil {
		return nil, nil, fmt.Errorf("search embeddings error: %w", err)
	}
	return &searchResponse, apiResp, nil
}

// ListEmbeddings lists embedding files in a repository path.
func (c *Client) ListEmbeddings(
	ctx context.Context,
	workspace, repository string,
	req ListEmbeddingsRequest,
) ([]irminmodels.EmbeddingFile, *irminmodels.IrminAPIResponse, error) {
	var embeddingFiles []irminmodels.EmbeddingFile

	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/repositories/%s/embeddings",
		workspace,
		repository,
	)

	// Add query parameters if provided
	if req.Ref != "" || req.Prefix != "" {
		params := url.Values{}
		if req.Ref != "" {
			params.Add("ref", req.Ref)
		}
		if req.Prefix != "" {
			params.Add("prefix", req.Prefix)
		}
		endpoint += "?" + params.Encode()
	}

	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &embeddingFiles)
	if err != nil {
		return nil, nil, fmt.Errorf("list embeddings error: %w", err)
	}
	return embeddingFiles, apiResp, nil
}

// GetEmbeddingInfo gets metadata about an embedding file.
func (c *Client) GetEmbeddingInfo(
	ctx context.Context,
	workspace, repository string,
	req GetEmbeddingInfoRequest,
) (*irminmodels.EmbeddingFile, *irminmodels.IrminAPIResponse, error) {
	var embeddingFile irminmodels.EmbeddingFile

	params := url.Values{}
	params.Add("embedding_path", req.EmbeddingPath)
	if req.Ref != "" {
		params.Add("ref", req.Ref)
	}

	endpoint := fmt.Sprintf(
		"/v1/workspaces/%s/repositories/%s/embeddings/info?%s",
		workspace,
		repository,
		params.Encode(),
	)

	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &embeddingFile)
	if err != nil {
		return nil, nil, fmt.Errorf("get embedding info error: %w", err)
	}
	return &embeddingFile, apiResp, nil
}

// UpsertEmbeddings inserts or updates embeddings with content-hash-based deduplication.
func (c *Client) UpsertEmbeddings(
	ctx context.Context,
	workspace, repository string,
	req UpsertEmbeddingsRequest,
) (*irminmodels.UpsertEmbeddingsResponse, *irminmodels.IrminAPIResponse, error) {
	var upsertResponse irminmodels.UpsertEmbeddingsResponse
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/embeddings/upsert",
			workspace,
			repository,
		),
		ContentType: "application/json",
		Body:        req,
	}, &upsertResponse)
	if err != nil {
		return nil, nil, fmt.Errorf("upsert embeddings error: %w", err)
	}
	return &upsertResponse, apiResp, nil
}

// UpdateEmbeddingMetadata updates metadata for specific embeddings by ID.
func (c *Client) UpdateEmbeddingMetadata(
	ctx context.Context,
	workspace, repository string,
	req UpdateEmbeddingMetadataRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPatch,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/embeddings/metadata",
			workspace,
			repository,
		),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("update embedding metadata error: %w", err)
	}
	return apiResp, nil
}

// UpdateEmbeddingPriority updates priority for specific embeddings by ID.
func (c *Client) UpdateEmbeddingPriority(
	ctx context.Context,
	workspace, repository string,
	req UpdateEmbeddingPriorityRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPatch,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/repositories/%s/embeddings/priority",
			workspace,
			repository,
		),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("update embedding priority error: %w", err)
	}
	return apiResp, nil
}
