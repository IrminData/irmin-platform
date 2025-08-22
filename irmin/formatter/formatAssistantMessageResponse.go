package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatAssistantMessageResponse creates a assistant message response object from a assistant message object.
func FormatAssistantMessageResponse(
	assistantMessage *db.AssistantMessage,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.AssistantMessage, error) {
	// Encode the message ID
	messageID, err := sqidManager.Encode("assistant_messages", uint64(assistantMessage.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding message ID: %w", err)
	}

	// Encode the conversation ID
	var conversationID string
	if assistantMessage.ConversationID != nil {
		var encodedConversationIDError error
		conversationID, encodedConversationIDError = sqidManager.Encode(
			"assistant_conversations",
			uint64(*assistantMessage.ConversationID),
		)
		if encodedConversationIDError != nil {
			return nil, fmt.Errorf("error encoding conversation ID: %w", encodedConversationIDError)
		}
	}

	// Construct the assistant message response.
	assistantMessageResponse := irminmodels.AssistantMessage{
		ID:             messageID,
		ConversationID: conversationID,
		Role:           irminmodels.AssistantMessageRole(assistantMessage.Role),
		Status:         assistantMessage.Status,
		ErrorMessage:   assistantMessage.ErrorMessage,
		Content:        assistantMessage.Content,
		ContentType:    assistantMessage.ContentType,
		BlockIndex:     assistantMessage.BlockIndex,
		Metadata:       assistantMessage.Metadata,
		InputTokens:    assistantMessage.InputTokens,
		OutputTokens:   assistantMessage.OutputTokens,
		AIModel:        assistantMessage.AIModel,
		SentAt:         assistantMessage.SentAt,
		CreatedAt:      assistantMessage.CreatedAt,
		UpdatedAt:      assistantMessage.UpdatedAt,
	}

	return &assistantMessageResponse, nil
}
