package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"irmin-api/mcp/helpers"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RetrieveContextRequest represents the request structure for retrieving context
type RetrieveContextRequest struct {
	Query string `json:"query"`
}

// RegisterDocsTools registers the tools for documentation retrieval
func (mcpTools *MCPTools) RegisterDocsTools() {
	mcpTools.registerRetrieveDocsContextTool()
}

// registerRetrieveDocsContextTool registers the retrieve_docs_context tool for getting context from documentation
func (mcpTools *MCPTools) registerRetrieveDocsContextTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "retrieve_docs_context",
			Description: "Retrieve relevant context from Irmin documentation for a given query.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args RetrieveContextRequest) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			_, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get collection ID for irmin-docs
			collectionID, err := mcpTools.getDocsCollectionID(ctx)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get docs collection ID", "error", err)
				return helpers.MCPError("Failed to access documentation collection"), struct{}{}, nil
			}

			// Make request to AI service
			retrieveReq := map[string]any{
				"query": args.Query,
			}

			result, err := mcpTools.makeAIRequest(ctx,
				fmt.Sprintf("/api/system/embeddings/collections/%s/retrieve-context", collectionID),
				retrieveReq,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to retrieve docs context", "error", err)
				return helpers.MCPError("Failed to retrieve docs context from documentation"), struct{}{}, nil
			}

			return result, struct{}{}, nil
		},
	)
}

// getDocsCollectionID retrieves the collection ID for the irmin-docs collection
func (mcpTools *MCPTools) getDocsCollectionID(ctx context.Context) (string, error) {
	// Make request to list collections and find irmin-docs
	result, err := mcpTools.makeAIRequest(ctx, "/api/system/embeddings/collections", nil)
	if err != nil {
		return "", fmt.Errorf("failed to list collections: %w", err)
	}

	// Parse the response to find the irmin-docs collection
	var response struct {
		Data []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"data"`
	}

	// Extract text content from MCP result
	var contentText string
	if len(result.Content) > 0 {
		if textContent, ok := result.Content[0].(*sdkmcp.TextContent); ok {
			contentText = textContent.Text
		} else {
			return "", errors.New("unexpected content type in response")
		}
	} else {
		return "", errors.New("empty response from AI service")
	}

	if unmarshalErr := json.Unmarshal([]byte(contentText), &response); unmarshalErr != nil {
		return "", fmt.Errorf("failed to parse collections response: %w", unmarshalErr)
	}

	const docsCollectionName = "irmin-docs"
	for _, collection := range response.Data {
		if collection.Name == docsCollectionName {
			return collection.ID, nil
		}
	}

	return "", errors.New("irmin-docs collection not found")
}

const (
	// AIServiceHTTPClientTimeout is the timeout for HTTP client requests
	AIServiceHTTPClientTimeout = 30 * time.Second
)

// makeAIRequest makes an HTTP request to the AI service
func (mcpTools *MCPTools) makeAIRequest(
	ctx context.Context,
	endpoint string,
	body any,
) (*sdkmcp.CallToolResult, error) {
	url := mcpTools.apiServices.Env.AIServiceBaseURL + endpoint

	var reqBody []byte
	var err error
	if body != nil {
		reqBody, err = json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
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

	// Convert response to MCP format
	responseJSON, err := json.MarshalIndent(responseBody, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %w", err)
	}

	return &sdkmcp.CallToolResult{
		Content: []sdkmcp.Content{
			&sdkmcp.TextContent{
				Text: string(responseJSON),
			},
		},
	}, nil
}
