package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// QueryGenerationRequest represents a request to generate a query from natural language
type QueryGenerationRequest struct {
	// Natural language prompt describing the desired query
	Prompt string `json:"prompt" validate:"required,min=1,max=1000"`

	// Optional repository slug for repository-specific queries
	RepositorySlug *string `json:"repository_slug,omitempty"`

	// Optional repository reference (branch, tag, commit)
	RepositoryRef *string `json:"repository_ref,omitempty"`

	// Optional conversation ID to continue an existing conversation
	ConversationID *string `json:"conversation_id,omitempty" validate:"validsqid=assistant_conversations"`

	// Optional metadata for the request
	Metadata map[string]any `json:"metadata,omitempty"`
}

// ListQueryGenerationConversations retrieves all query generation conversations in a workspace.
func (c *Client) ListQueryGenerationConversations(
	workspace string,
) ([]irminmodels.AssistantConversation, *irminmodels.IrminAPIResponse, error) {
	var conversations []irminmodels.AssistantConversation
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/assistant/query", workspace),
	}, &conversations)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch query generation conversations error: %w", err)
	}
	return conversations, apiResp, nil
}

// GenerateQuery generates a SQL query from natural language using the QueryAI assistant.
func (c *Client) GenerateQuery(
	workspace string,
	req QueryGenerationRequest,
) ([]irminmodels.AssistantMessage, *irminmodels.IrminAPIResponse, error) {
	var messages []irminmodels.AssistantMessage
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/assistant/query", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &messages)
	if err != nil {
		return nil, nil, fmt.Errorf("generate query error: %w", err)
	}
	return messages, apiResp, nil
}
