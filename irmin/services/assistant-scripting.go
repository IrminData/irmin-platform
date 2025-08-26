//nolint:dupl // Assistant query and script generation are similar in structure, but I don't think it's worth a refactor
package services

import (
	"context"
	"fmt"
	"irmin-api/ai"
	"irmin-api/db"
	"irmin-api/lib"
	"maps"
	"strings"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/anthropics/anthropic-sdk-go"
)

// validateScriptGenerationRequest validates the request for script generation
func (api *APIServices) validateScriptGenerationRequest(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.ScriptGenerationRequest,
) error {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionCreate); err != nil {
		return err
	}

	// Validate prompt is not empty
	if strings.TrimSpace(req.Prompt) == "" {
		return ErrInvalidRequest
	}

	return nil
}

// createOrGetScriptGenerationConversation creates a new conversation or gets an existing one for script generation
func (api *APIServices) createOrGetScriptGenerationConversation(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.ScriptGenerationRequest,
) (*db.AssistantConversation, error) {
	// If conversation ID is provided, try to get the existing conversation
	if req.ConversationID != nil {
		// Convert the SQID to an ID
		conversationID, err := api.SQIDManager.Decode("assistant_conversations", *req.ConversationID)
		if err != nil {
			api.Logger.ErrorContext(c, "Error converting conversation ID to ID", "error", err)
			return nil, err
		}

		// Fetch the conversation with the provided ID
		existingConversation, err := api.DB.GetAssistantConversationWithMessages(uint(conversationID))
		if err != nil {
			api.Logger.ErrorContext(c, "Error retrieving existing conversation", "error", err)
			return nil, err
		}

		// Verify the conversation belongs to the user and workspace
		if existingConversation.UserID != user.ID || existingConversation.WorkspaceID != workspace.ID {
			return nil, ErrAccessDenied
		}

		// Verify it's a ScriptingAI conversation
		if existingConversation.AssistantType != ai.ScriptingAI {
			return nil, ErrInvalidRequest
		}

		return existingConversation, nil
	}

	// Create new conversation with metadata
	convMetadata := map[string]any{
		"user_id":      user.ID,
		"workspace_id": workspace.ID,
		"created_by":   "script-generation",
		"prompt":       req.Prompt,
	}
	maps.Copy(convMetadata, req.Metadata)

	// Generate a title for the conversation
	title := fmt.Sprintf("Script Generation: %s", time.Now().Format("2006-01-02 15:04:05"))

	// Create conversation in database
	dbConversation := &db.AssistantConversation{
		Title:         title,
		WorkspaceID:   workspace.ID,
		UserID:        user.ID,
		Metadata:      convMetadata,
		AssistantType: ai.ScriptingAI,
		Hidden:        true, // Hidden from user since it's for script generation
	}

	if createErr := api.DB.CreateAssistantConversation(dbConversation); createErr != nil {
		api.Logger.ErrorContext(c, "Error creating script generation conversation in database", "error", createErr)
		return nil, createErr
	}

	return dbConversation, nil
}

// createScriptGenerationMessage creates and stores a script generation message
func (api *APIServices) createScriptGenerationMessage(
	conversation *db.AssistantConversation,
	message string,
	systemPrompt string,
	metadata map[string]any,
) error {
	userMessage := &db.AssistantMessage{
		ConversationID: &conversation.ID,
		Role:           anthropic.BetaMessageParamRoleUser,
		Content:        message,
		SystemPrompt:   &systemPrompt,
		Status:         irminmodels.AssistantMessageStatusSent,
		Metadata:       metadata,
		SentAt:         time.Now(),
	}

	return api.DB.CreateAssistantMessage(userMessage)
}

// processScriptGenerationResponse processes the AI response for script generation
func (api *APIServices) processScriptGenerationResponse(
	conversation *db.AssistantConversation,
	response *anthropic.BetaMessage,
	metadata map[string]any,
) ([]*db.AssistantMessage, error) {
	inputTokens := int(response.Usage.InputTokens)
	outputTokens := int(response.Usage.OutputTokens)

	// Extract all content blocks from the AI response
	contentBlocks := ai.ExtractResponseBlocks(response.Content)

	// Create a message for each content block
	var aiMessages []*db.AssistantMessage
	for i, block := range contentBlocks {
		blockIndex := i
		aiMessage := &db.AssistantMessage{
			ConversationID: &conversation.ID,
			Role:           anthropic.BetaMessageParamRoleAssistant,
			Content:        block.Content,
			ContentType:    block.Type,
			BlockIndex:     &blockIndex,
			Status:         irminmodels.AssistantMessageStatusSent,
			Metadata:       metadata,
			SentAt:         time.Now(),
			AIModel:        string(response.Model),
			AnthropicID:    response.ID,
			InputTokens:    &inputTokens,
			OutputTokens:   &outputTokens,
		}

		if err := api.DB.CreateAssistantMessage(aiMessage); err != nil {
			return nil, err
		}

		aiMessages = append(aiMessages, aiMessage)
	}

	// If no content blocks were extracted, create a fallback message
	if len(aiMessages) == 0 {
		fallbackContent := ai.ExtractResponseContent(response.Content)
		if fallbackContent == "" {
			fallbackContent = ErrNoContentExtracted.Error()
		}

		fallbackMessage := &db.AssistantMessage{
			ConversationID: &conversation.ID,
			Role:           anthropic.BetaMessageParamRoleAssistant,
			Content:        fallbackContent,
			ContentType:    irminmodels.AssistantMessageContentTypeText,
			BlockIndex:     nil, // No block index for fallback
			Status:         irminmodels.AssistantMessageStatusSent,
			Metadata:       metadata,
			SentAt:         time.Now(),
			AIModel:        string(response.Model),
			AnthropicID:    response.ID,
			InputTokens:    &inputTokens,
			OutputTokens:   &outputTokens,
		}

		if err := api.DB.CreateAssistantMessage(fallbackMessage); err != nil {
			return nil, err
		}

		aiMessages = append(aiMessages, fallbackMessage)
	}

	// Track message usage
	if err := api.DB.TrackNewMessageUsage(conversation, inputTokens, outputTokens, len(aiMessages), 1); err != nil {
		api.Logger.ErrorContext(context.Background(), "Error tracking message usage", "error", err)
		// Don't fail the operation if usage tracking fails
	}

	return aiMessages, nil
}

// prepareScriptGenerationMetadata prepares metadata for script generation messages
func (api *APIServices) prepareScriptGenerationMetadata(
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.ScriptGenerationRequest,
) map[string]any {
	newMetadata := map[string]any{
		"user_id":      user.ID,
		"workspace_id": workspace.ID,
		"source":       "script-generation",
		"prompt":       req.Prompt,
	}

	maps.Copy(newMetadata, req.Metadata)
	return newMetadata
}

// logScriptGenerationEvent logs the script generation event
func (api *APIServices) logScriptGenerationEvent(user *db.User, workspace *db.Workspace) {
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Script generated by user %s", user.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})
}

// initializeScriptingAIAndSendMessage initializes the ScriptingAI service and sends a message
func (api *APIServices) initializeScriptingAIAndSendMessage(
	c context.Context,
	userToken *string,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.ScriptGenerationRequest,
	conversation *db.AssistantConversation,
) (*ai.AI, *anthropic.BetaMessage, string, error) {
	// Initialize AI service with ScriptingAI type
	aiService, err := ai.NewAIFromEnv(api.Env, userToken, api.Logger)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating AI service", "error", err)
		return nil, nil, "", err
	}

	// Get conversation history from database
	dbConversation, err := api.DB.GetAssistantConversationWithMessages(conversation.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving conversation history", "error", err)
		// Continue without history rather than failing
		dbConversation = conversation
	}

	// Convert database messages to AI conversation format
	conversationHistory := make([]ai.ConversationMessage, 0, len(dbConversation.Messages))
	for _, msg := range dbConversation.Messages {
		conversationHistory = append(conversationHistory, ai.ConversationMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Only include schema in system prompt for first message (when no conversation history)
	includeSchema := len(conversationHistory) == 0
	enhancedSystemPrompt := api.buildEnhancedSystemPrompt(c, &buildEnhancedSystemPromptOptions{
		Locale:        "en",
		User:          user,
		Workspace:     workspace,
		IncludeSchema: includeSchema,
	})

	// Set the AI type for script generation
	scriptingAIType := ai.ScriptingAI

	// Create the MessageRequest for ScriptingAI
	messageReq := &ai.MessageRequest{
		Content:                req.Prompt,
		ConversationHistory:    conversationHistory,
		AIType:                 &scriptingAIType,
		AdditionalSystemPrompt: enhancedSystemPrompt,
	}

	// Send message to AI
	response, fullSystemPrompt, err := aiService.SendMessage(c, messageReq)
	if err != nil {
		api.Logger.ErrorContext(c, "Error sending message to ScriptingAI", "error", err)
		return nil, nil, "", err
	}

	return aiService, response, fullSystemPrompt, nil
}

// GenerateScript generates a Go script from natural language using the ScriptingAI
func (api *APIServices) GenerateScript(
	c context.Context,
	userToken *string,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.ScriptGenerationRequest,
) ([]*db.AssistantMessage, error) {
	// Validate request and permissions
	if err := api.validateScriptGenerationRequest(c, user, workspace, req); err != nil {
		return nil, err
	}

	// Create a hidden conversation for this script generation or get existing one
	conversation, err := api.createOrGetScriptGenerationConversation(c, user, workspace, req)
	if err != nil {
		return nil, err
	}

	// Prepare metadata
	newMetadata := api.prepareScriptGenerationMetadata(user, workspace, req)

	// Initialize ScriptingAI service and send message
	aiService, response, fullSystemPrompt, err := api.initializeScriptingAIAndSendMessage(
		c,
		userToken,
		user,
		workspace,
		req,
		conversation,
	)
	if err != nil {
		// Create a failed AI message to record the error
		errorMsg := err.Error()
		if createFailedMsgErr := api.createErrorMessage(
			conversation,
			"Failed to generate script",
			errorMsg,
			newMetadata,
		); createFailedMsgErr != nil {
			api.Logger.ErrorContext(c, "Error storing failed script generation message", "error", createFailedMsgErr)
		}
		return nil, err
	}

	// Store user message with system prompt
	if storeErr := api.createScriptGenerationMessage(conversation, req.Prompt, fullSystemPrompt, newMetadata); storeErr != nil {
		api.Logger.ErrorContext(c, "Error storing script generation message", "error", storeErr)
		return nil, storeErr
	}

	// Process AI response
	aiMessages, err := api.processScriptGenerationResponse(conversation, response, newMetadata)
	if err != nil {
		api.Logger.ErrorContext(c, "Error processing script generation response", "error", err)
		return nil, err
	}

	// Generate conversation title if needed
	api.generateConversationTitle(c, conversation, aiMessages, aiService)

	// Log the event
	api.logScriptGenerationEvent(user, workspace)

	return aiMessages, nil
}

// ListScriptGenerationConversations lists all script generation conversations for a user
func (api *APIServices) ListScriptGenerationConversations(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.AssistantConversation, error) {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionRead); err != nil {
		return nil, err
	}

	// Get conversations from database
	dbConversations, err := api.DB.GetAssistantConversationsByUserAndType(workspace.ID, user.ID, true, ai.ScriptingAI)
	if err != nil {
		return nil, err
	}

	return dbConversations, nil
}
