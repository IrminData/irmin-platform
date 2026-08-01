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
	UseHyde     *bool    `json:"useHyde,omitempty"` // Use HyDE by default (true); set to false to disable
	Reason      string   `json:"reason,omitempty"`  // Optional debugging context explaining why search is needed
}

// getAvailableDocsCollections returns the mapping of user-friendly collection names to internal names
func getAvailableDocsCollections() map[string]string {
	return map[string]string{
		"irmin":  "irmin-docs",
		"duckdb": "duckdb-sql-syntax-docs",
	}
}

// RegisterDocsTools registers the tools for documentation retrieval
func (mcpTools *MCPTools) RegisterDocsTools() {
	mcpTools.registerRetrieveDocsContextTool()
}

// retrieveDocsContextToolDescription is the description for the irmin_retrieve_docs_context tool
const retrieveDocsContextToolDescription = `Search documentation using advanced semantic search with HyDE (Hypothetical Document Embeddings).

Use this tool when:
- Initial context doesn't contain enough specific information
- You need detailed technical specifications or API references
- The user asks about specific features, functions, or configurations
- You want to verify or expand on information from conversation context

Collections available:
- 'irmin': Platform features, repositories, workflows, scripts, API endpoints
- 'duckdb': SQL syntax, functions, query optimization, data types

Returns numbered results with source attribution and relevance scores.

Parameters:
- query: Natural language search query (required)
- collections: Array of collection names to search (default: both)
- useHyde: Use hypothetical document generation for better matching (default: true)
- reason: Brief explanation of why search is needed (optional, for debugging)`

// registerRetrieveDocsContextTool registers the irmin_retrieve_docs_context tool for getting context from documentation
func (mcpTools *MCPTools) registerRetrieveDocsContextTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_retrieve_docs_context",
			Description: retrieveDocsContextToolDescription,
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args RetrieveContextRequest) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			_, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Determine which collections to search
			targetCollections := mcpTools.resolveTargetCollections(args.Collections)

			// Retrieve context from each collection
			combinedResults := mcpTools.retrieveFromCollections(ctx, targetCollections, args)

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

// resolveTargetCollections determines which collections to search based on requested collections
func (mcpTools *MCPTools) resolveTargetCollections(requested []string) map[string]string {
	available := getAvailableDocsCollections()

	if len(requested) == 0 {
		return available
	}

	targetCollections := make(map[string]string)
	for _, reqCol := range requested {
		if val, ok := available[reqCol]; ok {
			targetCollections[reqCol] = val
		}
	}
	return targetCollections
}

// retrieveFromCollections retrieves context from multiple collections
func (mcpTools *MCPTools) retrieveFromCollections(
	ctx context.Context,
	targetCollections map[string]string,
	args RetrieveContextRequest,
) map[string]any {
	combinedResults := make(map[string]any)

	for key, colName := range targetCollections {
		result := mcpTools.retrieveFromSingleCollection(ctx, colName, args)
		combinedResults[key] = result
	}

	return combinedResults
}

// retrieveFromSingleCollection retrieves context from a single collection
func (mcpTools *MCPTools) retrieveFromSingleCollection(
	ctx context.Context,
	colName string,
	args RetrieveContextRequest,
) any {
	// Get collection ID
	collectionID, err := mcpTools.getCollectionIDByName(ctx, colName)
	if err != nil {
		mcpTools.apiServices.Logger.ErrorContext(
			ctx,
			"Failed to get collection ID",
			"collection", colName,
			"error", err,
		)
		return map[string]string{"error": fmt.Sprintf("Collection %s not found", colName)}
	}

	// Build request
	retrieveReq := map[string]any{
		"query": args.Query,
	}
	if args.UseHyde != nil {
		retrieveReq["useHyde"] = *args.UseHyde
	}
	if args.Reason != "" {
		retrieveReq["reason"] = args.Reason
	}

	// Make request to AI service
	result, err := mcpTools.makeAIRequest(
		ctx,
		http.MethodPost,
		fmt.Sprintf("/api/system/embeddings/collections/%s/retrieve-context", collectionID),
		retrieveReq,
	)
	if err != nil {
		mcpTools.apiServices.Logger.ErrorContext(
			ctx,
			"Failed to retrieve docs context",
			"collection", colName,
			"error", err,
		)
		return map[string]string{"error": fmt.Sprintf("Failed to retrieve context: %v", err)}
	}

	return result
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
