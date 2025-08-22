package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatAssistantConversationResponse creates a assistant conversation response object from a assistant conversation object.
func FormatAssistantConversationResponse(
	assistantConversation *db.AssistantConversation,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.AssistantConversation, error) {
	// Encode the conversation ID
	conversationID, err := sqidManager.Encode("assistant_conversations", uint64(assistantConversation.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding conversation ID: %w", err)
	}

	// Construct the assistant conversation response.
	assistantConversationResponse := irminmodels.AssistantConversation{
		ID:                conversationID,
		Title:             assistantConversation.Title,
		Metadata:          assistantConversation.Metadata,
		TotalMessages:     assistantConversation.TotalMessages,
		UserMessages:      assistantConversation.UserMessages,
		AssistantMessages: assistantConversation.AssistantMessages,
		EstimatedTokens:   assistantConversation.EstimatedTokens,
		LastMessageAt:     assistantConversation.LastMessageAt,
		CreatedAt:         assistantConversation.CreatedAt,
		UpdatedAt:         assistantConversation.UpdatedAt,
	}

	// Format the workspace ID
	workspaceID, err := sqidManager.Encode("workspaces", uint64(assistantConversation.WorkspaceID))
	if err != nil {
		return nil, fmt.Errorf("error encoding workspace ID: %w", err)
	}
	assistantConversationResponse.WorkspaceID = workspaceID

	// Format the user ID
	userID, err := sqidManager.Encode("users", uint64(assistantConversation.UserID))
	if err != nil {
		return nil, fmt.Errorf("error encoding user ID: %w", err)
	}
	assistantConversationResponse.UserID = userID

	// Format the messages, if any
	if len(assistantConversation.Messages) > 0 {
		assistantConversationResponse.Messages = make([]irminmodels.AssistantMessage, 0)
		for _, message := range assistantConversation.Messages {
			messageResponse, formatMessageErr := FormatAssistantMessageResponse(&message, sqidManager)
			if formatMessageErr != nil {
				return nil, fmt.Errorf("error formatting message: %w", formatMessageErr)
			}
			assistantConversationResponse.Messages = append(assistantConversationResponse.Messages, *messageResponse)
		}
	}

	return &assistantConversationResponse, nil
}
