package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"irmin-api/mcp/helpers"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RetrieveContextRequest represents the request structure for retrieving context
type RetrieveContextRequest struct {
	Query       string   `json:"query"`
	Collections []string `json:"collections,omitempty"`
}

// RegisterDocsTools registers the tools for documentation retrieval
func (mcpTools *MCPTools) RegisterDocsTools() {
	mcpTools.registerRetrieveDocsContextTool()
}

// registerRetrieveDocsContextTool registers the irmin_retrieve_docs_context tool for getting context from documentation
func (mcpTools *MCPTools) registerRetrieveDocsContextTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_retrieve_docs_context",
			Description: "Retrieve relevant documentation context using semantic search across Irmin platform docs and DuckDB SQL reference. Returns context-aware documentation snippets for specific features, concepts, or SQL syntax. Requires a natural language query describing what you need to learn. Optionally specify collections array: 'irmin' (platform features, repositories, workflows, scripts) or 'duckdb' (SQL syntax, functions, query optimization). Defaults to searching both. Use this before creating repositories, workflows, queries, or scripts to understand configuration options and best practices.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args RetrieveContextRequest) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			_, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Define available collections
			availableCollections := map[string]string{
				"irmin":  "irmin-docs",
				"duckdb": "duckdb-sql-syntax-docs",
			}

			// Determine which collections to search
			targetCollections := make(map[string]string)
			if len(args.Collections) == 0 {
				targetCollections = availableCollections
			} else {
				for _, reqCol := range args.Collections {
					if val, ok := availableCollections[reqCol]; ok {
						targetCollections[reqCol] = val
					}
				}
			}

			combinedResults := make(map[string]any)

			for key, colName := range targetCollections {
				// Get collection ID
				var collectionID string
				collectionID, err = mcpTools.getCollectionIDByName(ctx, colName)
				if err != nil {
					mcpTools.apiServices.Logger.Error(
						"Failed to get collection ID",
						"collection",
						colName,
						"error",
						err,
					)
					combinedResults[key] = map[string]string{"error": fmt.Sprintf("Collection %s not found", colName)}
					continue
				}

				// Make request to AI service
				retrieveReq := map[string]any{
					"query": args.Query,
				}

				result, retrieveErr := mcpTools.makeAIRequest(
					ctx,
					http.MethodPost,
					fmt.Sprintf("/api/system/embeddings/collections/%s/retrieve-context", collectionID),
					retrieveReq,
				)
				if retrieveErr != nil {
					mcpTools.apiServices.Logger.Error(
						"Failed to retrieve docs context",
						"collection",
						colName,
						"error",
						retrieveErr,
					)
					combinedResults[key] = map[string]string{
						"error": fmt.Sprintf("Failed to retrieve context: %v", retrieveErr),
					}
					continue
				}

				combinedResults[key] = result
			}

			// Convert combined response to JSON
			responseJSON, err := json.MarshalIndent(combinedResults, "", "  ")
			if err != nil {
				return nil, struct{}{}, fmt.Errorf("failed to marshal combined response: %w", err)
			}

			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{
						Text: string(responseJSON),
					},
				},
			}, struct{}{}, nil
		},
	)
}

// getCollectionIDByName retrieves the collection ID for a given collection name
func (mcpTools *MCPTools) getCollectionIDByName(ctx context.Context, collectionName string) (string, error) {
	// Make request to list collections
	result, err := mcpTools.makeAIRequest(ctx, http.MethodGet, "/api/system/embeddings/collections", nil)
	if err != nil {
		return "", fmt.Errorf("failed to list collections: %w", err)
	}

	// Parse the response to find the collection
	data, ok := result["data"].([]any)
	if !ok {
		return "", errors.New("unexpected response format: data field missing or not an array")
	}

	var availableCollections []string
	for _, item := range data {
		collection, okItem := item.(map[string]any)
		if !okItem {
			continue
		}

		name, okName := collection["name"].(string)
		if !okName {
			continue
		}
		availableCollections = append(availableCollections, name)

		if name == collectionName {
			id, okID := collection["id"].(string)
			if okID {
				return id, nil
			}
		}
	}

	return "", fmt.Errorf("collection %s not found (available: %v)", collectionName, availableCollections)
}

const (
	// AIServiceHTTPClientTimeout is the timeout for HTTP client requests
	AIServiceHTTPClientTimeout = 30 * time.Second
)

// makeAIRequest makes an HTTP request to the AI service
func (mcpTools *MCPTools) makeAIRequest(
	ctx context.Context,
	method string,
	endpoint string,
	body any,
) (map[string]any, error) {
	url := mcpTools.apiServices.Env.AIServiceBaseURL + endpoint

	if method == "" {
		method = http.MethodPost
	}

	var reqBody io.Reader
	if body != nil {
		marshaledBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(marshaledBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+mcpTools.apiServices.Env.AIServiceSystemToken)

	client := &http.Client{
		Timeout: AIServiceHTTPClientTimeout,
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI service returned status %d", resp.StatusCode)
	}

	var responseBody map[string]any
	if decodeErr := json.NewDecoder(resp.Body).Decode(&responseBody); decodeErr != nil {
		return nil, fmt.Errorf("failed to decode response: %w", decodeErr)
	}

	return responseBody, nil
}
