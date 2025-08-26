package services

import (
	"context"
	"encoding/json"
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

// validateQueryGenerationRequest validates the request for query generation
func (api *APIServices) validateQueryGenerationRequest(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.QueryGenerationRequest,
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

// createOrGetQueryGenerationConversation creates a new conversation or gets an existing one for query generation
func (api *APIServices) createOrGetQueryGenerationConversation(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.QueryGenerationRequest,
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

		// Verify it's a QueryAI conversation
		if existingConversation.AssistantType != ai.QueryAI {
			return nil, ErrInvalidRequest
		}

		return existingConversation, nil
	}

	// Create new conversation with metadata
	convMetadata := map[string]any{
		"user_id":      user.ID,
		"workspace_id": workspace.ID,
		"created_by":   "query-generation",
		"prompt":       req.Prompt,
	}
	maps.Copy(convMetadata, req.Metadata)

	// Generate a title for the conversation
	title := fmt.Sprintf("Query Generation: %s", time.Now().Format("2006-01-02 15:04:05"))

	// Create conversation in database
	dbConversation := &db.AssistantConversation{
		Title:         title,
		WorkspaceID:   workspace.ID,
		UserID:        user.ID,
		Metadata:      convMetadata,
		AssistantType: ai.QueryAI,
		Hidden:        true, // Hidden from user since it's for query generation
	}

	if createErr := api.DB.CreateAssistantConversation(dbConversation); createErr != nil {
		api.Logger.ErrorContext(c, "Error creating query generation conversation in database", "error", createErr)
		return nil, createErr
	}

	return dbConversation, nil
}

// createQueryGenerationMessage creates and stores a query generation message
func (api *APIServices) createQueryGenerationMessage(
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

// processQueryGenerationResponse processes the AI response for query generation
func (api *APIServices) processQueryGenerationResponse(
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

	// Track message usage
	if err := api.DB.TrackNewMessageUsage(conversation, inputTokens, outputTokens, len(aiMessages), 1); err != nil {
		api.Logger.ErrorContext(context.Background(), "Error tracking message usage", "error", err)
		// Don't fail the operation if usage tracking fails
	}

	return aiMessages, nil
}

// prepareQueryGenerationMetadata prepares metadata for query generation messages
func (api *APIServices) prepareQueryGenerationMetadata(
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.QueryGenerationRequest,
) map[string]any {
	newMetadata := map[string]any{
		"user_id":         user.ID,
		"workspace_id":    workspace.ID,
		"repository_slug": req.RepositorySlug,
		"repository_ref":  req.RepositoryRef,
		"source":          "query-generation",
		"prompt":          req.Prompt,
	}

	maps.Copy(newMetadata, req.Metadata)
	return newMetadata
}

// buildEnhancedSystemPrompt builds an enhanced system prompt with context information and relevant schemas
func (api *APIServices) buildEnhancedSystemPrompt(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.QueryGenerationRequest,
) string {
	var enhancedSystemPrompt strings.Builder

	// Add workspace information
	if workspace != nil {
		enhancedSystemPrompt.WriteString(fmt.Sprintf("Workspace: %s (%s)\n", workspace.Name, workspace.Slug))
	}

	// Add repository context if specified
	var objectSchema *irminmodels.ObjectSchema
	var getSchemaErr error
	if req.RepositorySlug != nil {
		// Get the repository
		repository, err := api.GetRepositoryBySlug(c, locale, user, workspace, *req.RepositorySlug)
		if err != nil {
			api.Logger.ErrorContext(c, "Error getting repository", "error", err)
			return enhancedSystemPrompt.String()
		}
		// Add repository information to the prompt
		enhancedSystemPrompt.WriteString(fmt.Sprintf("\nRepository: %s\n", repository.Slug))

		// Determine the repository reference to use, defaulting to the default branch of the repository
		schemaRefToUse := repository.DefaultBranch
		if req.RepositoryRef != nil {
			schemaRefToUse = *req.RepositoryRef
		}

		// Add reference information
		enhancedSystemPrompt.WriteString(fmt.Sprintf("Reference (e.g. branch, tag, commit hash): %s\n", schemaRefToUse))

		// Get the root object schema for the repository at the ref
		objectSchema, getSchemaErr = api.GetRepositoryObjectSchema(
			c,
			locale,
			user,
			workspace,
			repository,
			&db.RepositoryObject{
				Path:          "",
				Name:          "",
				RepositoryRef: schemaRefToUse,
				Type:          irminmodels.ObjectTypeGroup,
			},
			schemaRefToUse,
		)
	} else {
		// Get the workspace schema without connections, but with repositories
		objectSchema, getSchemaErr = api.GetWorkspaceSchema(c, locale, user, workspace, false, true)
	}

	// Check if the object schema generation failed
	if getSchemaErr != nil {
		api.Logger.ErrorContext(c, "Error getting repository object schema", "error", getSchemaErr)
		return enhancedSystemPrompt.String()
	}

	// Add schema information as a JSON object to the prompt
	schemaJSON, err := json.Marshal(objectSchema)
	if err != nil {
		api.Logger.ErrorContext(c, "Error marshalling object schema to JSON", "error", err)
		return enhancedSystemPrompt.String()
	}
	enhancedSystemPrompt.WriteString(fmt.Sprintf("Schema: %s\n", string(schemaJSON)))

	// Return the final system prompt
	return enhancedSystemPrompt.String()
}

// buildEnhancedQueryPrompt builds an enhanced prompt with context information and a relevant schema
func (api *APIServices) buildEnhancedQueryPrompt(
	req *irmincore.QueryGenerationRequest,
	workspace *db.Workspace,
) string {
	var enhancedPrompt strings.Builder
	enhancedPrompt.WriteString(req.Prompt)
	enhancedPrompt.WriteString("\n\n")

	// Add basic workspace information
	if workspace != nil {
		enhancedPrompt.WriteString(fmt.Sprintf("Workspace: %s (%s)\n", workspace.Name, workspace.Slug))
	}

	// Return the final prompt
	return enhancedPrompt.String()
}

// logQueryGenerationEvent logs the query generation event
func (api *APIServices) logQueryGenerationEvent(user *db.User, workspace *db.Workspace) {
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Query generated by user %s", user.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})
}

// initializeQueryAIAndSendMessage initializes the QueryAI service and sends a message
func (api *APIServices) initializeQueryAIAndSendMessage(
	c context.Context,
	userToken *string,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.QueryGenerationRequest,
	conversation *db.AssistantConversation,
) (*ai.AI, *anthropic.BetaMessage, string, error) {
	// Initialize AI service with QueryAI type
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

	// Build the enhanced prompt with context
	enhancedPrompt := api.buildEnhancedQueryPrompt(req, workspace)

	// Build the enhanced system prompt with schemas and repository information
	enhancedSystemPrompt := api.buildEnhancedSystemPrompt(c, "en", user, workspace, req)

	// Set the AI type for query generation
	queryAIType := ai.QueryAI

	// Create the MessageRequest for QueryAI
	messageReq := &ai.MessageRequest{
		Content:             enhancedPrompt,
		ConversationHistory: conversationHistory,
		AIType:              &queryAIType,
		AdditionalSystemPrompt: fmt.Sprintf(
			"Context:\n The current workspace is '%s'. \n The current user '%s', with email '%s'. \n The current UTC date and time is %s.\n\n%s",
			conversation.Workspace.Slug,
			conversation.User.FirstName+" "+conversation.User.LastName,
			conversation.User.Email,
			time.Now().UTC().Format("2006-01-02 15:04:05"),
			enhancedSystemPrompt,
		),
	}

	// Send message to AI
	response, fullSystemPrompt, err := aiService.SendMessage(c, messageReq)
	if err != nil {
		api.Logger.ErrorContext(c, "Error sending message to QueryAI", "error", err)
		return nil, nil, "", err
	}

	return aiService, response, fullSystemPrompt, nil
}

// GenerateQuery generates a SQL query from natural language using the QueryAI
func (api *APIServices) GenerateQuery(
	c context.Context,
	userToken *string,
	user *db.User,
	workspace *db.Workspace,
	req *irmincore.QueryGenerationRequest,
) ([]*db.AssistantMessage, error) {
	// Validate request and permissions
	if err := api.validateQueryGenerationRequest(c, user, workspace, req); err != nil {
		return nil, err
	}

	// Create a hidden conversation for this query generation or get existing one
	conversation, err := api.createOrGetQueryGenerationConversation(c, user, workspace, req)
	if err != nil {
		return nil, err
	}

	// Prepare metadata
	newMetadata := api.prepareQueryGenerationMetadata(user, workspace, req)

	// Initialize QueryAI service and send message
	_, response, fullSystemPrompt, err := api.initializeQueryAIAndSendMessage(
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
			"Failed to generate query",
			errorMsg,
			newMetadata,
		); createFailedMsgErr != nil {
			api.Logger.ErrorContext(c, "Error storing failed query generation message", "error", createFailedMsgErr)
		}
		return nil, err
	}

	// Store user message with system prompt
	if storeErr := api.createQueryGenerationMessage(conversation, req.Prompt, fullSystemPrompt, newMetadata); storeErr != nil {
		api.Logger.ErrorContext(c, "Error storing query generation message", "error", storeErr)
		return nil, storeErr
	}

	// Process AI response
	aiMessages, err := api.processQueryGenerationResponse(conversation, response, newMetadata)
	if err != nil {
		api.Logger.ErrorContext(c, "Error processing query generation response", "error", err)
		return nil, err
	}

	// Log the event
	api.logQueryGenerationEvent(user, workspace)

	return aiMessages, nil
}

// GetQueryGenerationConversation retrieves a query generation conversation by ID
func (api *APIServices) GetQueryGenerationConversation(
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

	// Make sure this is a query generation conversation
	if dbConversation.AssistantType != ai.QueryAI {
		return nil, ErrInvalidRequest
	}

	return dbConversation, nil
}

// ListQueryGenerationConversations lists all query generation conversations for a user
func (api *APIServices) ListQueryGenerationConversations(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.AssistantConversation, error) {
	// Make sure this is allowed
	if err := api.checkAssistantPermission(c, user, workspace, db.PolicyActionRead); err != nil {
		return nil, err
	}

	// Get conversations from database, filtering by QueryAI type and hidden status
	// Note: This would require a new database method or modification to existing one
	// For now, we'll return an empty list since these conversations are hidden
	// TODO: Implement proper filtering for query generation conversations
	return []db.AssistantConversation{}, nil
}

// DeleteQueryGenerationConversation deletes a query generation conversation
func (api *APIServices) DeleteQueryGenerationConversation(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
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

	// Make sure this is a query generation conversation
	if conversation.AssistantType != ai.QueryAI {
		return ErrInvalidRequest
	}

	// Perform the database operation
	if deleteErr := api.DB.DeleteAssistantConversation(conversation.ID); deleteErr != nil {
		return deleteErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Query generation conversation deleted: %s", conversation.Title),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}
