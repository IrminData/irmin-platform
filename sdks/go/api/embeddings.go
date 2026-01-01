package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
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
	Query         string            `json:"query"          validate:"required"          example:"What is machine learning?"`    // Query text to search for
	EmbeddingPath string            `json:"embedding_path" validate:"required"          example:"embeddings/documents.parquet"` // Path to the embedding file
	Ref           string            `json:"ref"            validate:"omitempty,max=100" example:"main"`                         // Repository reference (branch/tag/commit)
	TopK          int               `json:"top_k"          validate:"omitempty,min=1"   example:"10"`                           // Number of results to return (default: 10)
	Filter        map[string]string `json:"filter"         validate:"omitempty"`                                                // Optional metadata filters
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
