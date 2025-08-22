package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// validateAssistantContext validates the common context for assistant operations
func (api *APIControllers) validateAssistantContext(
	c fiber.Ctx,
) (locales.Dictionary, *db.User, *db.Workspace, *string, error) {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	userToken, userTokenOk := c.Locals("user_token").(*string)
	if !dictOk || !userOk || !workspaceOk || !userTokenOk {
		return nil, nil, nil, nil, utils.WriteResponse(
			c,
			fiber.StatusInternalServerError,
			irminmodels.IrminAPIResponse{},
		)
	}
	return dict, user, workspace, userToken, nil
}

// getAssistantConversationContext extracts the assistant conversation from the context
func (api *APIControllers) getAssistantConversationContext(c fiber.Ctx) (*db.AssistantConversation, *string, error) {
	conversationSqid := c.Params("assistant_conversation")
	conversation, conversationOk := c.Locals("assistant_conversation").(*db.AssistantConversation)
	if !conversationOk {
		return nil, nil, utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}
	return conversation, &conversationSqid, nil
}

// AssistantConversationsIndex godoc
// @Summary List assistant conversations in workspace
// @Description Get all assistant conversations in the specified workspace that the user has permission to read
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.AssistantConversation} "Conversations retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations [get]
//
//nolint:dupl // This controller is not a duplicate, but similar in structure to the other index controllers
func (api *APIControllers) AssistantConversationsIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the conversations
	conversations, err := api.Services.ListAssistantConversations(c, user, workspace)
	if err != nil {
		api.Logger.Error("Error listing assistant conversations", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	conversationsResponse, formatErr := formatter.FormatIndexResponse(
		conversations,
		formatter.FormatAssistantConversationResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting assistant conversations", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response with raw data for now
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: conversationsResponse,
	})
}

// AssistantConversationsStore godoc
// @Summary Create a new assistant conversation
// @Description Create a new assistant conversation in the specified workspace
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.CreateAssistantConversationRequest true "Conversation creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.AssistantConversation} "Conversation created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations [post]
func (api *APIControllers) AssistantConversationsStore(c fiber.Ctx) error {
	dict, user, workspace, userToken, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Parse and validate the JSON request body
	var req irmincore.CreateAssistantConversationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Invalidate caches that may be affected by this action after finishing
	defer func() {
		invalidateCacheErr := api.invalidateAssistantCache(c, workspace, nil)
		if invalidateCacheErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
		}
	}()

	// Create the conversation
	conversation, err := api.Services.CreateAssistantConversation(c, userToken, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error creating assistant conversation", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	conversationResponse, formatErr := formatter.FormatAssistantConversationResponse(conversation, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting assistant conversation", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response with raw data for now
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "assistant_conversation_created"),
		Data:    conversationResponse,
	})
}

// AssistantConversationsShow godoc
// @Summary Get assistant conversation details
// @Description Get details of a specific assistant conversation by its ID
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.AssistantConversation} "Conversation retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Conversation not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations/{conversation_id} [get]
func (api *APIControllers) AssistantConversationsShow(c fiber.Ctx) error {
	dict, _, _, _, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, _, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Structure the response.
	conversationResponse, formatErr := formatter.FormatAssistantConversationResponse(conversation, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting assistant conversation", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response with raw data for now
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: conversationResponse,
	})
}

// AssistantConversationsDestroy godoc
// @Summary Delete assistant conversation
// @Description Delete an existing assistant conversation from the workspace
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Conversation deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Conversation not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations/{conversation_id} [delete]
//
//nolint:dupl // This controller is not a duplicate, but similar in structure to the other controllers
func (api *APIControllers) AssistantConversationsDestroy(c fiber.Ctx) error {
	dict, user, workspace, userToken, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, conversationSqid, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Invalidate caches that may be affected by this action after finishing
	defer func() {
		invalidateCacheErr := api.invalidateAssistantCache(c, workspace, conversationSqid)
		if invalidateCacheErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
		}
	}()

	// Delete the conversation
	err = api.Services.DeleteAssistantConversation(c, userToken, user, workspace, conversationSqid, conversation)
	if err != nil {
		api.Logger.Error("Error deleting assistant conversation", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "assistant_conversation_deleted"),
	})
}

// AssistantConversationsClear godoc
// @Summary Clear assistant conversation messages
// @Description Clear all messages from an existing assistant conversation
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Conversation messages cleared successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Conversation not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations/{conversation_id}/clear [post]
//
//nolint:dupl // This controller is not a duplicate, but similar in structure to the other controllers
func (api *APIControllers) AssistantConversationsClear(c fiber.Ctx) error {
	dict, user, workspace, userToken, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, conversationSqid, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Invalidate caches that may be affected by this action after finishing
	defer func() {
		invalidateCacheErr := api.invalidateAssistantCache(c, workspace, conversationSqid)
		if invalidateCacheErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
		}
	}()

	// Clear the conversation messages
	err = api.Services.ClearAssistantConversation(c, userToken, user, workspace, conversationSqid, conversation)
	if err != nil {
		api.Logger.Error("Error clearing assistant conversation messages", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "assistant_conversation_cleared"),
	})
}

// AssistantConversationsUpdate godoc
// @Summary Update assistant conversation
// @Description Update an existing assistant conversation
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Param request body irmincore.UpdateAssistantConversationRequest true "Conversation update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse "Conversation updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Conversation not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations/{conversation_id} [patch]
func (api *APIControllers) AssistantConversationsUpdate(c fiber.Ctx) error {
	dict, user, workspace, _, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, conversationSqid, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Parse and validate the JSON request body
	var req irmincore.UpdateAssistantConversationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Invalidate caches that may be affected by this action after finishing
	defer func() {
		invalidateCacheErr := api.invalidateAssistantCache(c, workspace, nil)
		if invalidateCacheErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
		}
	}()

	// Update the conversation title
	conversation, err = api.Services.UpdateAssistantConversation(
		c,
		user,
		workspace,
		conversationSqid,
		conversation,
		req,
	)
	if err != nil {
		api.Logger.Error("Error updating assistant conversation title", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	conversationResponse, formatErr := formatter.FormatAssistantConversationResponse(conversation, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting assistant conversation", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "assistant_conversation_updated"),
		Data:    conversationResponse,
	})
}

// AssistantConversationsStats godoc
// @Summary Get assistant conversation statistics
// @Description Get statistics for a specific assistant conversation
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=object} "Conversation statistics retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Conversation not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations/{conversation_id}/stats [get]
func (api *APIControllers) AssistantConversationsStats(c fiber.Ctx) error {
	dict, user, workspace, _, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, _, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Get the conversation statistics
	stats, err := api.Services.GetAssistantConversationStats(c, user, workspace, conversation)
	if err != nil {
		api.Logger.Error("Error getting assistant conversation stats", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: stats,
	})
}

// AssistantMessagesStore godoc
// @Summary Send message to assistant
// @Description Send a message to the AI assistant and get a response
// @Tags assistant
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Param request body irmincore.CreateAssistantMessageRequest true "Message parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.AssistantMessage} "Message sent successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/conversations/{conversation_id}/messages [post]
func (api *APIControllers) AssistantMessagesStore(c fiber.Ctx) error {
	dict, user, workspace, userToken, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, conversationSqid, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Parse and validate the JSON request body
	var req irmincore.CreateAssistantMessageRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Invalidate caches that may be affected by this action after finishing
	defer func() {
		invalidateCacheErr := api.invalidateAssistantCache(c, workspace, conversationSqid)
		if invalidateCacheErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
		}
	}()

	// Send the message to the assistant
	response, err := api.Services.SendAssistantMessage(
		c,
		userToken,
		user,
		workspace,
		req.Message,
		conversation,
		nil,
	)
	if err != nil {
		api.Logger.Error("Error sending message to assistant", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response for all messages
	var allMessagesResponse []*irminmodels.AssistantMessage
	for _, msg := range response {
		msgResponse, formatErr := formatter.FormatAssistantMessageResponse(msg, api.SQIDManager)
		if formatErr != nil {
			api.Logger.Error("Error formatting assistant message", "error", formatErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		allMessagesResponse = append(allMessagesResponse, msgResponse)
	}

	// Return the response with raw data for now
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "assistant_message_sent"),
		Data:    allMessagesResponse,
	})
}

// invalidateAssistantCache invalidates the cache for an assistant conversation or all conversations, for the current user
func (api *APIControllers) invalidateAssistantCache(
	c fiber.Ctx,
	workspace *db.Workspace,
	conversationID *string,
) error {
	var invalidateCacheErr error
	if conversationID == nil {
		invalidateCacheErr = irmincache.InvalidatePathPrefixForCurrentUser(
			c,
			api.cacheStorage,
			fmt.Sprintf("/api/v1/workspaces/%s/assistant/conversations", workspace.Slug),
		)
	} else {
		invalidateCacheErr = irmincache.InvalidatePathPrefixForCurrentUser(
			c,
			api.cacheStorage,
			fmt.Sprintf("/api/v1/workspaces/%s/assistant/conversations/%s", workspace.Slug, *conversationID),
		)
	}
	return invalidateCacheErr
}
