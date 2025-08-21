package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateAssistantMessageRequest represents the JSON request body for creating assistant messages.
type CreateAssistantMessageRequest struct {
	Message string `json:"message" validate:"required,max=100" example:"What is the capital of France?"`
}

// CreateAssistantConversationRequest represents the JSON request body for creating assistant conversations.
type CreateAssistantConversationRequest struct {
	Title    string         `json:"title"    example:"My conversation"`
	Metadata map[string]any `json:"metadata"`
}

// UpdateAssistantConversationRequest represents the request to update an assistant conversation.
type UpdateAssistantConversationRequest struct {
	Title    string         `json:"title"    example:"My conversation"`
	Metadata map[string]any `json:"metadata"`
}

func (c *Client) ListAssistantConversations(
	workspace string,
) ([]irminmodels.AssistantConversation, *irminmodels.IrminAPIResponse, error) {
	var conversations []irminmodels.AssistantConversation
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/assistant/conversations", workspace),
	}, &conversations)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch assistant conversations error: %w", err)
	}
	return conversations, apiResp, nil
}

func (c *Client) GetAssistantConversation(
	workspace, conversationID string,
) (*irminmodels.AssistantConversation, *irminmodels.IrminAPIResponse, error) {
	var conversation irminmodels.AssistantConversation
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/assistant/conversations/%s", workspace, conversationID),
	}, &conversation)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch assistant conversation error: %w", err)
	}
	return &conversation, apiResp, nil
}

func (c *Client) CreateAssistantConversation(
	workspace string,
	req CreateAssistantConversationRequest,
) (*irminmodels.AssistantConversation, *irminmodels.IrminAPIResponse, error) {
	var newConversation irminmodels.AssistantConversation
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/assistant/conversations", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &newConversation)
	if err != nil {
		return nil, nil, fmt.Errorf("create assistant conversation error: %w", err)
	}
	return &newConversation, apiResp, nil
}

// UpdateAssistantConversation updates an assistant conversation.
func (c *Client) UpdateAssistantConversation(
	workspace, conversationID string,
	req UpdateAssistantConversationRequest,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/assistant/conversations/%s", workspace, conversationID),
		ContentType: "application/json",
		Body:        req,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("update assistant conversation error: %w", err)
	}
	return apiResp, nil
}

// DeleteAssistantConversation deletes an assistant conversation by its ID.
func (c *Client) DeleteAssistantConversation(workspace, conversationID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/assistant/conversations/%s", workspace, conversationID),
		ContentType: "application/json",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete assistant conversation error: %w", err)
	}
	return apiResp, nil
}

// ClearAssistantConversation clears all messages from an assistant conversation.
func (c *Client) ClearAssistantConversation(workspace, conversationID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/assistant/conversations/%s/clear", workspace, conversationID),
		ContentType: "application/json",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("clear assistant conversation error: %w", err)
	}
	return apiResp, nil
}

// GetAssistantConversationStats retrieves statistics for a specific assistant conversation.
func (c *Client) GetAssistantConversationStats(
	workspace, conversationID string,
) (map[string]any, *irminmodels.IrminAPIResponse, error) {
	var stats map[string]any
	apiResp, err := c.FetchAPI(RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/assistant/conversations/%s/stats",
			workspace,
			conversationID,
		),
	}, &stats)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch assistant conversation stats error: %w", err)
	}
	return stats, apiResp, nil
}

// SendAssistantMessage sends a message to the AI assistant and gets a response.
func (c *Client) SendAssistantMessage(
	workspace string,
	conversationID string,
	req CreateAssistantMessageRequest,
) (*irminmodels.AssistantMessage, *irminmodels.IrminAPIResponse, error) {
	var response irminmodels.AssistantMessage
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/assistant/conversations/%s/messages", workspace, conversationID),
		ContentType: "application/json",
		Body:        req,
	}, &response)
	if err != nil {
		return nil, nil, fmt.Errorf("send assistant message error: %w", err)
	}
	return &response, apiResp, nil
}
