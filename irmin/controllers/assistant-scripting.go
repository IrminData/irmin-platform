//nolint:dupl // Assistant query and script generation are similar in structure, but I don't think it's worth a refactor
package controllers

import (
	"irmin-api/formatter"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ScriptGenerationIndex godoc
// @Summary List script generation conversations
// @Description Get all script generation conversations in the specified workspace that the user has permission to read
// @Tags assistant-script
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.AssistantConversation} "Script generation conversations retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/script [get]
//
//nolint:dupl // This controller follows the same pattern as other index controllers, which is intentional
func (api *APIControllers) ScriptGenerationIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the script generation conversations
	conversations, err := api.Services.ListScriptGenerationConversations(c, user, workspace)
	if err != nil {
		api.Logger.Error("Error listing script generation conversations", "error", err)
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
		api.Logger.Error("Error formatting script generation conversations", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: conversationsResponse,
	})
}

// ScriptGenerationStore godoc
// @Summary Generate a SQL script from natural language
// @Description Generate a SQL script from natural language using the ScriptAI assistant
// @Tags assistant-script
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.ScriptGenerationRequest true "Script generation parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.AssistantMessage} "Script generated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/script [post]
func (api *APIControllers) ScriptGenerationStore(c fiber.Ctx) error {
	dict, user, workspace, userToken, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Parse and validate the JSON request body
	var req irmincore.ScriptGenerationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Generate the script
	messages, err := api.Services.GenerateScript(c, userToken, user, workspace, &req)
	if err != nil {
		api.Logger.Error("Error generating script", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response for all messages
	var allMessagesResponse []*irminmodels.AssistantMessage
	for _, msg := range messages {
		msgResponse, formatErr := formatter.FormatAssistantMessageResponse(msg, api.SQIDManager)
		if formatErr != nil {
			api.Logger.Error("Error formatting assistant message", "error", formatErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		allMessagesResponse = append(allMessagesResponse, msgResponse)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "assistant_message_sent"),
		Data:    allMessagesResponse,
	})
}

// ScriptGenerationShow godoc
// @Summary Get script generation conversation details
// @Description Get details of a specific script generation conversation by its ID
// @Tags assistant-script
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.AssistantConversation} "Script generation conversation retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Conversation not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/script/{conversation_id} [get]
func (api *APIControllers) ScriptGenerationShow(c fiber.Ctx) error {
	dict, user, workspace, _, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, _, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Get the script generation conversation
	scriptConversation, err := api.Services.GetScriptGenerationConversation(c, user, workspace, conversation)
	if err != nil {
		api.Logger.Error("Error getting script generation conversation", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	conversationResponse, formatErr := formatter.FormatAssistantConversationResponse(
		scriptConversation,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting script generation conversation", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: conversationResponse,
	})
}

// ScriptGenerationDestroy godoc
// @Summary Delete script generation conversation
// @Description Delete an existing script generation conversation from the workspace
// @Tags assistant-script
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param conversation_id path string true "Conversation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Script generation conversation deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Conversation not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/script/{conversation_id} [delete]
func (api *APIControllers) ScriptGenerationDestroy(c fiber.Ctx) error {
	dict, user, workspace, _, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Get the conversation from the context
	conversation, _, err := api.getAssistantConversationContext(c)
	if err != nil {
		return err
	}

	// Delete the script generation conversation
	err = api.Services.DeleteScriptGenerationConversation(c, user, workspace, conversation)
	if err != nil {
		api.Logger.Error("Error deleting script generation conversation", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "assistant_conversation_deleted"),
	})
}
