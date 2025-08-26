package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ScriptGenerationRequest represents a request to generate a script from natural language
type ScriptGenerationRequest struct {
	// Natural language prompt describing the desired script
	Prompt string `json:"prompt" validate:"required,min=1,max=1000"`

	// Optional conversation ID to continue an existing conversation
	ConversationID *string `json:"conversation_id,omitempty" validate:"validsqid=assistant_conversations"`

	// Optional metadata for the request
	Metadata map[string]any `json:"metadata,omitempty"`
}

// ListScriptGenerationConversations retrieves all script generation conversations in a workspace.
func (c *Client) ListScriptGenerationConversations(
	workspace string,
) ([]irminmodels.AssistantConversation, *irminmodels.IrminAPIResponse, error) {
	var conversations []irminmodels.AssistantConversation
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/assistant/script", workspace),
	}, &conversations)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch script generation conversations error: %w", err)
	}
	return conversations, apiResp, nil
}

// GenerateScript generates a Go script from natural language using the ScriptingAI assistant.
func (c *Client) GenerateScript(
	workspace string,
	req ScriptGenerationRequest,
) ([]irminmodels.AssistantMessage, *irminmodels.IrminAPIResponse, error) {
	var messages []irminmodels.AssistantMessage
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/assistant/script", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &messages)
	if err != nil {
		return nil, nil, fmt.Errorf("generate script error: %w", err)
	}
	return messages, apiResp, nil
}
