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

// validateAssistantMessageRequest validates the request for sending an assistant message
func (api *APIServices) validateAssistantMessageRequest(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	conversation *db.AssistantConversation,
) error {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionCreate); err != nil {
		return err
	}

	// Make sure the conversation exists
	if conversation == nil {
		return ErrNotFound
	}

	// Make sure the conversation belongs to the user and workspace
	if conversation.UserID != user.ID || conversation.WorkspaceID != workspace.ID {
		return ErrAccessDenied
	}

	return nil
}

// createUserMessage creates and stores a user message in the database
func (api *APIServices) createUserMessage(
	conversation *db.AssistantConversation,
	message string,
	metadata map[string]any,
) error {
	userMessage := &db.AssistantMessage{
		ConversationID: &conversation.ID,
		Role:           anthropic.BetaMessageParamRoleUser,
		Content:        message,
		Status:         irminmodels.AssistantMessageStatusSent,
		Metadata:       metadata,
		SentAt:         time.Now(),
	}

	return api.DB.CreateAssistantMessage(userMessage)
}

// createErrorMessage creates and stores an error message in the database
func (api *APIServices) createErrorMessage(
	conversation *db.AssistantConversation,
	content string,
	errorMessage string,
	metadata map[string]any,
) error {
	errorMsg := &db.AssistantMessage{
		ConversationID: &conversation.ID,
		Role:           anthropic.BetaMessageParamRoleAssistant,
		Content:        content,
		Status:         irminmodels.AssistantMessageStatusError,
		ErrorMessage:   &errorMessage,
		Metadata:       metadata,
		SentAt:         time.Now(),
	}

	return api.DB.CreateAssistantMessage(errorMsg)
}

// processAIResponse processes the AI response and creates database messages
func (api *APIServices) processAIResponse(
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
			fallbackContent = "No content could be extracted from AI response"
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

	// Track new message usage and return the messages
	return aiMessages, api.DB.TrackNewMessageUsage(conversation, inputTokens, outputTokens, len(aiMessages), 1)
}

// generateConversationTitle generates a title for the conversation if it's still a placeholder
func (api *APIServices) generateConversationTitle(
	c context.Context,
	conversation *db.AssistantConversation,
	aiMessages []*db.AssistantMessage,
	aiService *ai.AI,
) {
	if !strings.HasPrefix(conversation.Title, "New Conversation") {
		return
	}

	// Use the first AI message content for title generation
	firstMessageContent := ""
	if len(aiMessages) > 0 {
		firstMessageContent = aiMessages[0].Content
	}

	if title, err := aiService.GenerateConversationTitle(c, firstMessageContent); err == nil {
		conversation.Title = title
		if updateErr := api.DB.UpdateAssistantConversation(conversation); updateErr != nil {
			api.Logger.ErrorContext(c, "Error updating conversation title", "error", updateErr)
			// Don't fail the whole operation if title generation fails
		}
	}
}

// prepareMessageMetadata prepares metadata for assistant messages
func (api *APIServices) prepareMessageMetadata(
	user *db.User,
	workspace *db.Workspace,
	opts *ai.MessageRequest,
) map[string]any {
	if opts == nil {
		opts = &ai.MessageRequest{}
	}

	newMetadata := map[string]any{
		"user_id":      user.ID,
		"workspace_id": workspace.ID,
		"source":       "api",
	}
	maps.Copy(newMetadata, opts.Metadata)
	return newMetadata
}

// initializeAIAndSendMessage initializes the AI service and sends a message
func (api *APIServices) initializeAIAndSendMessage(
	c context.Context,
	userToken *string,
	message string,
	opts *ai.MessageRequest,
	conversation *db.AssistantConversation,
	metadata map[string]any,
) (*ai.AI, *anthropic.BetaMessage, error) {
	// Initialize AI service
	aiService, err := ai.NewAIFromEnv(api.Env, userToken, api.Logger)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating AI service", "error", err)
		// Create a failed AI message to record the error
		errorMsg := err.Error()
		if createFailedMsgErr := api.createErrorMessage(
			conversation,
			"Failed to initialize AI service",
			errorMsg,
			metadata,
		); createFailedMsgErr != nil {
			api.Logger.ErrorContext(c, "Error storing failed AI message", "error", createFailedMsgErr)
		}
		return nil, nil, err
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

	// Create a copy of the MessageRequest to avoid mutating the original
	var req *ai.MessageRequest
	if opts == nil {
		req = &ai.MessageRequest{Content: message}
	} else {
		// Deep copy the opts to avoid mutating the original
		req = &ai.MessageRequest{
			Content:                message, // Override with the current message
			ConversationID:         opts.ConversationID,
			MaxTokens:              opts.MaxTokens,
			Model:                  opts.Model,
			Temperature:            opts.Temperature,
			TopP:                   opts.TopP,
			Stream:                 opts.Stream,
			Metadata:               opts.Metadata,
			ThinkingEnabled:        opts.ThinkingEnabled,
			DocsToolsOnly:          opts.DocsToolsOnly,
			AIType:                 opts.AIType,
			AdditionalSystemPrompt: opts.AdditionalSystemPrompt,
		}
	}
	req.ConversationHistory = conversationHistory

	// Send message to AI
	response, err := aiService.SendMessage(c, req)
	if err != nil {
		api.Logger.ErrorContext(c, "Error sending message to AI", "error", err)
		// Create a failed AI message to record the error
		errorMsg := err.Error()
		if createFailedMsgErr := api.createErrorMessage(
			conversation,
			"Failed to get response from AI service",
			errorMsg,
			metadata,
		); createFailedMsgErr != nil {
			api.Logger.ErrorContext(c, "Error storing failed AI message", "error", createFailedMsgErr)
		}
		return nil, nil, err
	}

	return aiService, response, nil
}

// logAssistantMessageEvent logs the assistant message event
func (api *APIServices) logAssistantMessageEvent(user *db.User, workspace *db.Workspace) {
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Assistant message sent by user %s", user.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})
}

// SendAssistantMessage sends a message to the AI assistant and returns the response
func (api *APIServices) SendAssistantMessage(
	c context.Context,
	userToken *string,
	user *db.User,
	workspace *db.Workspace,
	message string,
	conversation *db.AssistantConversation,
	opts *ai.MessageRequest,
) ([]*db.AssistantMessage, error) {
	// Set defaults - use the conversation's assistant type with fallback
	assistantType := conversation.AssistantType
	if assistantType == "" {
		assistantType = ai.AssistantAI // Fallback to default if not set
	}
	messageOpts := &ai.MessageRequest{
		Content: message,
		AIType:  &assistantType, // Use the conversation's stored assistant type
		AdditionalSystemPrompt: fmt.Sprintf(
			"Context:\n The current workspace is '%s'. \n The current user '%s', with email '%s'. \n The current UTC date and time is %s.",
			workspace.Slug,
			user.FirstName+" "+user.LastName,
			user.Email,
			time.Now().UTC().Format("2006-01-02 15:04:05"),
		),
	}

	// Override with any provided options
	if opts != nil {
		api.overrideMessageOptions(messageOpts, opts)
	}

	// Validate request and permissions
	if err := api.validateAssistantMessageRequest(c, user, workspace, conversation); err != nil {
		return nil, err
	}

	// Prepare metadata
	newMetadata := api.prepareMessageMetadata(user, workspace, messageOpts)

	// Store user message
	if err := api.createUserMessage(conversation, message, newMetadata); err != nil {
		api.Logger.ErrorContext(c, "Error storing user message", "error", err)
		return nil, err
	}

	// Initialize AI service and send message
	aiService, response, err := api.initializeAIAndSendMessage(
		c,
		userToken,
		message,
		messageOpts,
		conversation,
		newMetadata,
	)
	if err != nil {
		return nil, err
	}

	// Process AI response
	aiMessages, err := api.processAIResponse(conversation, response, newMetadata)
	if err != nil {
		api.Logger.ErrorContext(c, "Error processing AI response", "error", err)
		return nil, err
	}

	// Generate conversation title if needed
	api.generateConversationTitle(c, conversation, aiMessages, aiService)

	// Log the event
	api.logAssistantMessageEvent(user, workspace)

	return aiMessages, nil
}

// GetAssistantConversation retrieves a conversation by ID with all messages
func (api *APIServices) GetAssistantConversation(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	conversation *db.AssistantConversation,
) (*db.AssistantConversation, error) {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionRead); err != nil {
		return nil, err
	}

	// Get conversation from database with messages
	dbConversation, err := api.DB.GetAssistantConversationWithMessages(conversation.ID)
	if err != nil {
		return nil, ErrNotFound
	}

	// Make sure the conversation belongs to the user and workspace
	if dbConversation.UserID != user.ID || dbConversation.WorkspaceID != workspace.ID {
		return nil, ErrAccessDenied
	}

	return dbConversation, nil
}

// ListAssistantConversations lists all conversations for a user
func (api *APIServices) ListAssistantConversations(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.AssistantConversation, error) {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionRead); err != nil {
		return nil, err
	}

	// Get conversations from database
	dbConversations, err := api.DB.GetAssistantConversationsByUser(workspace.ID, user.ID)
	if err != nil {
		return nil, err
	}

	return dbConversations, nil
}

// CreateAssistantConversation creates a new conversation
func (api *APIServices) CreateAssistantConversation(
	c context.Context,
	_ *string,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateAssistantConversationRequest,
) (*db.AssistantConversation, error) {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionCreate); err != nil {
		return nil, err
	}

	// Create conversation with metadata
	convMetadata := map[string]any{
		"user_id":      user.ID,
		"workspace_id": workspace.ID,
		"created_by":   "api",
	}
	maps.Copy(convMetadata, req.Metadata)

	// Set title - use user-defined title if provided, otherwise use placeholder
	var title string
	if req.Title != "" {
		title = req.Title
	} else {
		// Generate a placeholder title with timestamp
		title = fmt.Sprintf("New Conversation %s", time.Now().Format("2006-01-02 15:04:05"))
	}

	// Create conversation in database
	dbConversation := &db.AssistantConversation{
		Title:         title,
		WorkspaceID:   workspace.ID,
		UserID:        user.ID,
		Metadata:      convMetadata,
		AssistantType: ai.AssistantAI,
		Hidden:        false,
	}
	if createErr := api.DB.CreateAssistantConversation(dbConversation); createErr != nil {
		api.Logger.ErrorContext(c, "Error creating conversation in database", "error", createErr)
		return nil, createErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Assistant conversation created by user %s", user.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return the created conversation
	return dbConversation, nil
}

// UpdateAssistantConversation updates an existing conversation
func (api *APIServices) UpdateAssistantConversation(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	_ *string,
	conversation *db.AssistantConversation,
	req irmincore.UpdateAssistantConversationRequest,
) (*db.AssistantConversation, error) {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionUpdate); err != nil {
		return nil, err
	}

	// Make sure the conversation belongs to the user and workspace
	if conversation.UserID != user.ID || conversation.WorkspaceID != workspace.ID {
		return nil, ErrAccessDenied
	}

	// Update the conversation
	if req.Title != "" {
		conversation.Title = req.Title
	}
	maps.Copy(conversation.Metadata, req.Metadata)

	// Update the conversation in the database
	if updateErr := api.DB.UpdateAssistantConversation(conversation); updateErr != nil {
		return nil, updateErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Assistant conversation updated: %s", conversation.Title),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return conversation, nil
}

// DeleteAssistantConversation deletes a conversation and all its messages
func (api *APIServices) DeleteAssistantConversation(
	c context.Context,
	_ *string,
	user *db.User,
	workspace *db.Workspace,
	_ *string,
	conversation *db.AssistantConversation,
) error {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionDelete); err != nil {
		return err
	}

	// Make sure the conversation belongs to the user and workspace
	if conversation.UserID != user.ID || conversation.WorkspaceID != workspace.ID {
		return ErrAccessDenied
	}

	// Perform the database operation
	if deleteErr := api.DB.DeleteAssistantConversation(conversation.ID); deleteErr != nil {
		return deleteErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Assistant conversation deleted: %s", conversation.Title),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

// ClearAssistantConversation clears all messages from a conversation
func (api *APIServices) ClearAssistantConversation(
	c context.Context,
	_ *string,
	user *db.User,
	workspace *db.Workspace,
	_ *string,
	conversation *db.AssistantConversation,
) error {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionUpdate); err != nil {
		return err
	}

	// Make sure the conversation belongs to the user and workspace
	if conversation.UserID != user.ID || conversation.WorkspaceID != workspace.ID {
		return ErrAccessDenied
	}

	// Perform the database operation
	if clearErr := api.DB.ClearAssistantConversationMessages(conversation.ID); clearErr != nil {
		api.Logger.ErrorContext(c, "Error clearing assistant conversation messages in database", "error", clearErr)
		return clearErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Assistant conversation cleared: %s", conversation.Title),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

// GetAssistantConversationStats returns statistics about a conversation
func (api *APIServices) GetAssistantConversationStats(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	conversation *db.AssistantConversation,
) (*irminmodels.AssistantConversationStats, error) {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionRead); err != nil {
		return nil, err
	}

	// Get stats from database
	stats, err := api.DB.GetAssistantConversationStats(conversation.ID)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

// Helper methods

// overrideMessageOptions overrides message options with provided values
func (api *APIServices) overrideMessageOptions(messageOpts *ai.MessageRequest, opts *ai.MessageRequest) {
	if opts.MaxTokens != nil {
		messageOpts.MaxTokens = opts.MaxTokens
	}
	if opts.Model != nil {
		messageOpts.Model = opts.Model
	}
	if opts.Temperature != nil {
		messageOpts.Temperature = opts.Temperature
	}
	if opts.TopP != nil {
		messageOpts.TopP = opts.TopP
	}
	if opts.Stream {
		messageOpts.Stream = opts.Stream
	}
	if opts.Metadata != nil {
		messageOpts.Metadata = opts.Metadata
	}
	if opts.ThinkingEnabled {
		messageOpts.ThinkingEnabled = opts.ThinkingEnabled
	}
	if opts.DocsToolsOnly {
		messageOpts.DocsToolsOnly = opts.DocsToolsOnly
	}
	if opts.AIType != nil {
		messageOpts.AIType = opts.AIType
	}
	if opts.AdditionalSystemPrompt != "" {
		messageOpts.AdditionalSystemPrompt = opts.AdditionalSystemPrompt
	}
}

// checkAssistantPermission checks if a user has permission to perform an action on the assistant
func (api *APIServices) checkAssistantPermission(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	action db.PolicyAction,
) error {
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAssistant,
		nil,
		action,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			fmt.Sprintf("User is not allowed to %s assistant resource", action),
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return ErrAccessDenied
	}
	return nil
}
