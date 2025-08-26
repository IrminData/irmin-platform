//nolint:dupl // Assistant query and script generation are similar in structure, but I don't think it's worth a refactor
package controllers

import (
	"irmin-api/formatter"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// QueryGenerationIndex godoc
// @Summary List query generation conversations
// @Description Get all query generation conversations in the specified workspace that the user has permission to read
// @Tags assistant-query
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.AssistantConversation} "Query generation conversations retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/query [get]
//
//nolint:dupl // This controller follows the same pattern as other index controllers, which is intentional
func (api *APIControllers) QueryGenerationIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the query generation conversations
	conversations, err := api.Services.ListQueryGenerationConversations(c, user, workspace)
	if err != nil {
		api.Logger.Error("Error listing query generation conversations", "error", err)
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
		api.Logger.Error("Error formatting query generation conversations", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: conversationsResponse,
	})
}

// QueryGenerationStore godoc
// @Summary Generate a SQL query from natural language
// @Description Generate a SQL query from natural language using the QueryAI assistant
// @Tags assistant-query
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.QueryGenerationRequest true "Query generation parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.AssistantMessage} "Query generated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/assistant/query [post]
func (api *APIControllers) QueryGenerationStore(c fiber.Ctx) error {
	dict, user, workspace, userToken, err := api.validateAssistantContext(c)
	if err != nil {
		return err
	}

	// Parse and validate the JSON request body
	var req irmincore.QueryGenerationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Generate the query
	messages, err := api.Services.GenerateQuery(c, userToken, user, workspace, &req)
	if err != nil {
		api.Logger.Error("Error generating query", "error", err)
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
