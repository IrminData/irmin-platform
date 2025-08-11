package controllers

import (
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// WorkspaceInvitesIndex godoc
// @Summary List workspace invites
// @Description Get all invites in the specified workspace that the user has permission to read
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Invite} "Invites retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/invites [get]
//
//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other index functions
func (api *APIControllers) WorkspaceInvitesIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the invites.
	invites, err := api.Services.ListInvitesToWorkspace(c, workspace, user)
	if err != nil {
		api.Logger.Error("Error listing invites", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	invitesResponse, formatErr := formatter.FormatIndexResponse(
		invites,
		formatter.FormatInviteResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting invites", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: invitesResponse,
	})
}

// SendInvite godoc
// @Summary Send workspace invite
// @Description Send an invitation to join the workspace to the specified email address
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.SendInviteRequest true "Invite parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Invite} "Invite sent successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 409 {object} irminmodels.IrminAPIResponse "Conflict - user already in workspace or already invited"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/invites [post]
func (api *APIControllers) SendInvite(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	locale, localeOk := c.Locals("locale").(string)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !localeOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.SendInviteRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Send the invite.
	inviteResult, err := api.Services.SendInvite(c, locale, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error sending invite", "error", err)

		if errors.Is(err, services.ErrUserAlreadyInWorkspace) {
			return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "already_in_workspace")},
			})
		}

		if errors.Is(err, services.ErrUserAlreadyInvitedToWorkspace) {
			return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "already_invited_to_workspace")},
			})
		}

		if errors.Is(err, services.ErrInvalidRole) {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_role")},
			})
		}

		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, formatInviteResponseErr := formatter.FormatInviteResponse(inviteResult.Invite, api.SQIDManager)
	if formatInviteResponseErr != nil {
		api.Logger.Error("Error formatting invite response", "error", formatInviteResponseErr)
	}

	// Invalidate invites list for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/invites", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_sent"),
		Data:    inviteResponse,
	})
}

// InvitesShow godoc
// @Summary Get invite details
// @Description Get details of a specific invite by its ID
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param invite_id path string true "Invite ID (SQID)"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Invite} "Invite retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Invite not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/invites/{invite_id} [get]
func (api *APIControllers) InvitesShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	if !dictOk || !inviteOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the invite
	inviteResponse, err := formatter.FormatInviteResponse(invite, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting invite response", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: inviteResponse,
	})
}

// InvitesUpdate godoc
// @Summary Update invite
// @Description Update an existing invite's role assignment
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param invite_id path string true "Invite ID (SQID)"
// @Param request body irmincore.UpdateInviteRequest true "Invite update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Invite} "Invite updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Invite not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/invites/{invite_id} [patch]
func (api *APIControllers) InvitesUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.UpdateInviteRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update the invite
	invite, err := api.Services.UpdateInvite(c, user, invite, req)
	if err != nil {
		api.Logger.Error("Error updating invite", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, formatInviteResponseErr := formatter.FormatInviteResponse(invite, api.SQIDManager)
	if formatInviteResponseErr != nil {
		api.Logger.Error("Error formatting invite response", "error", formatInviteResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate invites list for this workspace (all users)
	workspace, ok := c.Locals("workspace").(*db.Workspace)
	if ok {
		if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
			api.cacheStorage,
			fmt.Sprintf("/api/v1/workspaces/%s/invites", workspace.Slug),
		); invalidationErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidationErr)
		}
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_updated"),
		Data:    inviteResponse,
	})
}

// InvitesDestroy godoc
// @Summary Delete invite
// @Description Delete an existing invite and revoke it in Clerk
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param invite_id path string true "Invite ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Invite deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Invite not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/invites/{invite_id} [delete]
func (api *APIControllers) InvitesDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the invite
	if err := api.Services.DeleteInvite(c, user, invite); err != nil {
		api.Logger.Error("Error deleting invite", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate invites list for this workspace (all users)
	workspace, ok := c.Locals("workspace").(*db.Workspace)
	if ok {
		if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
			api.cacheStorage,
			fmt.Sprintf("/api/v1/workspaces/%s/invites", workspace.Slug),
		); invalidationErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidationErr)
		}
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_deleted"),
	})
}

// ResendInvite godoc
// @Summary Resend invite
// @Description Resend an existing invite with a new expiration date
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param invite_id path string true "Invite ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Invite} "Invite resent successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Invite not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/invites/{invite_id}/resend [post]
func (api *APIControllers) ResendInvite(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !localeOk || !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Resend the invite
	if err := api.Services.ResendInvite(c, locale, user, invite); err != nil {
		api.Logger.Error("Error resending invite", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, formatInviteResponseErr := formatter.FormatInviteResponse(invite, api.SQIDManager)
	if formatInviteResponseErr != nil {
		api.Logger.Error("Error formatting invite response", "error", formatInviteResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate invites list for this workspace (all users)
	workspace, ok := c.Locals("workspace").(*db.Workspace)
	if ok {
		if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
			api.cacheStorage,
			fmt.Sprintf("/api/v1/workspaces/%s/invites", workspace.Slug),
		); invalidationErr != nil {
			api.Logger.Error("Error invalidating cache", "error", invalidationErr)
		}
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_sent"),
		Data:    inviteResponse,
	})
}

// IndexMyInvites godoc
// @Summary List my invites
// @Description Get all invites sent to the current authenticated user's email address
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Invite} "User invites retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /invites/my [get]
func (api *APIControllers) IndexMyInvites(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Fetch invites for the user
	invites, err := api.Services.ListInvitesForUser(c, user)
	if err != nil {
		api.Logger.Error("Error fetching invites", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Prepare response
	var invitesResponse []irminmodels.Invite
	for _, invite := range invites {
		// Format the invite
		inviteResponse, formatInviteResponseErr := formatter.FormatInviteResponse(&invite, api.SQIDManager)
		if formatInviteResponseErr != nil {
			api.Logger.Error("Error formatting invite response", "error", formatInviteResponseErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		// Append to response
		invitesResponse = append(invitesResponse, *inviteResponse)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: invitesResponse,
	})
}

// AcceptInvite godoc
// @Summary Accept invite
// @Description Accept an invite and join the workspace with the specified role
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param invite_id path string true "Invite ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Invite accepted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - user not allowed to accept this invite"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Invite not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /invites/{invite_id}/accept [post]
func (api *APIControllers) AcceptInvite(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Accept the invite
	if err := api.Services.AcceptInvite(c, user, invite); err != nil {
		api.Logger.Error("Error accepting invite", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace users list (all users), my invites (current user), and workspaces list (current user)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/users", invite.Workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/invites"); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/workspaces"); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_accepted"),
	})
}

// DeclineInvite godoc
// @Summary Decline invite
// @Description Decline an invite to join a workspace
// @Tags invites
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param invite_id path string true "Invite ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Invite declined successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - user not allowed to decline this invite"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Invite not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /invites/{invite_id}/decline [post]
func (api *APIControllers) DeclineInvite(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Decline the invite
	if err := api.Services.DeclineInvite(c, user, invite); err != nil {
		api.Logger.Error("Error declining invite", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate my invites (current user) and the invites list for the workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/invites"); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/invites", invite.Workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_declined"),
	})
}
