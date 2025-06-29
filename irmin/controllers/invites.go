package controllers

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other index functions
func (api *APIControllers) WorkspaceInvitesIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all invites in the workspace.
	invites, getInvitesErr := api.DB.GetInvitesByWorkspace(workspace.ID)
	if getInvitesErr != nil {
		api.Logger.Error("Error fetching invites", "error", getInvitesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter invites based on user permissions
	filteredInvites, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceInvite,
		db.PolicyActionRead,
		invites,
		func(i db.Invite) uint { return i.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering invites by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	invitesResponse, formatErr := formatter.FormatIndexResponse(
		filteredInvites,
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: invitesResponse,
	})
}

// sendInviteInTransaction handles the transactional creation of invites in both database and Clerk.
func (api *APIControllers) sendInviteInTransaction(
	ctx context.Context,
	req irmincore.SendInviteRequest,
	role *db.Role,
	user *db.User,
	workspace *db.Workspace,
	locale string,
) (*db.Invite, error) {
	var newInvite *db.Invite
	var clerkInvite *clerk.Invitation

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create the invite in the database
		expiresAt := time.Now().Add(time.Duration(api.Env.InviteExpiresInDays) * 24 * time.Hour)
		newInvite = &db.Invite{
			Email:       req.Email,
			ExpiresAt:   expiresAt,
			RoleID:      role.ID,
			InvitedByID: user.ID,
			WorkspaceID: workspace.ID,
		}
		if createInviteErr := tx.Create(&newInvite).Error; createInviteErr != nil {
			api.Logger.Error("Error creating invite", "error", createInviteErr)
			return createInviteErr
		}

		// Create sqid for the invite
		inviteSqid, encodeInviteSqidErr := api.SQIDManager.Encode("invites", uint64(newInvite.ID))
		if encodeInviteSqidErr != nil {
			api.Logger.Error("Error encoding invite sqid", "error", encodeInviteSqidErr)
			return encodeInviteSqidErr
		}

		// Create the invite acceptance URL
		inviteAcceptanceURL := fmt.Sprintf(
			"%s/%s/invite/%s",
			api.Env.ConsoleURL,
			locale,
			inviteSqid,
		)

		// Set the API key with your Clerk Secret Key.
		clerk.SetKey(api.Env.ClerkSecretKey)

		// Create the invite in Clerk
		expiresInDays := int64(api.Env.InviteExpiresInDays)
		var createClerkInviteErr error
		clerkInvite, createClerkInviteErr = invitation.Create(ctx, &invitation.CreateParams{
			EmailAddress:  req.Email,
			RedirectURL:   &inviteAcceptanceURL,
			ExpiresInDays: &expiresInDays,
		})
		if createClerkInviteErr != nil {
			api.Logger.Error("Error creating Clerk invite", "error", createClerkInviteErr)
			return createClerkInviteErr
		}

		// Update invite with Clerk ID
		newInvite.ClerkID = clerkInvite.ID
		if updateInviteErr := tx.Save(&newInvite).Error; updateInviteErr != nil {
			api.Logger.Error("Error updating invite with Clerk ID", "error", updateInviteErr)
			return updateInviteErr
		}

		return nil
	})

	return newInvite, transactionErr
}

// SendInvite sends an invite to a user to join a workspace.
//

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
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.Email == "" || req.Role == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate email
	if !utils.ValidateEmail(req.Email) {
		api.Logger.Error("Invalid email", "email", req.Email)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Check if user is already in workspace
	alreadyInWorkspace, err := api.DB.IsUserInWorkspaceByEmail(req.Email, workspace.ID)
	if err != nil || alreadyInWorkspace {
		api.Logger.Error("User already in workspace", "email", req.Email, "error", err)
		return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "already_in_workspace")},
		})
	}

	// Check if user is already invited
	existingInvites, err := api.DB.GetInvitesByEmail(req.Email)
	if err != nil {
		api.Logger.Error("Error checking existing invites", "email", req.Email, "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	for _, invite := range existingInvites {
		if invite.WorkspaceID == workspace.ID {
			api.Logger.Error("User already invited to workspace", "email", req.Email)
			return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "already_invited_to_workspace")},
			})
		}
	}

	// Decode the role id
	roleID, err := api.SQIDManager.Decode("roles", req.Role)
	if err != nil {
		api.Logger.Error("Error decoding role", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the role by ID
	role, err := api.DB.GetRole(uint(roleID))
	if err != nil {
		api.Logger.Error("Error getting role", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	if role == nil {
		api.Logger.Error("Role not found", "role", req.Role)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Use database transaction to ensure atomicity
	newInvite, transactionErr := api.sendInviteInTransaction(c.Context(), req, role, user, workspace, locale)
	if transactionErr != nil {
		api.Logger.Error("Transaction failed for invite creation", "error", transactionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, formatInviteResponseErr := formatter.FormatInviteResponse(newInvite, api.SQIDManager)
	if formatInviteResponseErr != nil {
		api.Logger.Error("Error formatting invite response", "error", formatInviteResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Invite sent to %s, role: %s", newInvite.Email, role.Role),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_sent"),
		Data:    inviteResponse,
	})
}

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
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: inviteResponse,
	})
}

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

	// Validate required fields
	if req.Role == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse the role id
	roleID, err := api.SQIDManager.Decode("roles", req.Role)
	if err != nil {
		api.Logger.Error("Error decoding role", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the role by ID
	role, err := api.DB.GetRole(uint(roleID))
	if err != nil {
		api.Logger.Error("Error getting role", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	if role == nil {
		api.Logger.Error("Role not found", "role", req.Role)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update the invite
	invite.RoleID = role.ID
	if updateInviteErr := api.DB.Save(&invite).Error; updateInviteErr != nil {
		api.Logger.Error("Error updating invite", "error", updateInviteErr)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Invite for %s updated, role: %s", invite.Email, role.Role),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_updated"),
		Data:    inviteResponse,
	})
}

// deleteInviteInTransaction handles the transactional deletion of invites from both Clerk and database.
func (api *APIControllers) deleteInviteInTransaction(
	ctx context.Context,
	invite *db.Invite,
) error {
	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Revoke the invite in Clerk first
		_, revokeErr := invitation.Revoke(ctx, invite.ClerkID)
		if revokeErr != nil {
			api.Logger.Error("Error revoking invite in Clerk", "error", revokeErr)
			return revokeErr
		}

		// Delete the invite from database
		if deleteErr := tx.Delete(&db.Invite{}, invite.ID).Error; deleteErr != nil {
			api.Logger.Error("Error deleting invite from database", "error", deleteErr)
			return deleteErr
		}

		return nil
	})

	return transactionErr
}

// resendInviteInTransaction handles the transactional resending of invites (revoke old + create new).
func (api *APIControllers) resendInviteInTransaction(
	ctx context.Context,
	invite *db.Invite,
	locale string,
) error {
	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create sqid for the invite
		inviteSqid, err := api.SQIDManager.Encode("invites", uint64(invite.ID))
		if err != nil {
			api.Logger.Error("Error encoding invite sqid", "error", err)
			return err
		}

		// Set the API key with your Clerk Secret Key.
		clerk.SetKey(api.Env.ClerkSecretKey)

		// Store the ID of the existing invite in Clerk
		existingClerkInviteID := invite.ClerkID

		// Create new invite in Clerk
		inviteAcceptanceURL := fmt.Sprintf(
			"%s/%s/invite/%s",
			api.Env.ConsoleURL,
			locale,
			inviteSqid,
		)
		expiresInDays := int64(api.Env.InviteExpiresInDays)
		clerkInvite, createClerkInviteErr := invitation.Create(ctx, &invitation.CreateParams{
			EmailAddress:  invite.Email,
			RedirectURL:   &inviteAcceptanceURL,
			ExpiresInDays: &expiresInDays,
		})
		if createClerkInviteErr != nil {
			api.Logger.Error("Error creating Clerk invite", "error", createClerkInviteErr)
			return createClerkInviteErr
		}

		// Update the invite with the Clerk ID and the new expiration date
		expiresAt := time.Now().Add(time.Duration(api.Env.InviteExpiresInDays) * 24 * time.Hour)
		invite.ClerkID = clerkInvite.ID
		invite.ExpiresAt = expiresAt
		if updateInviteErr := tx.Save(&invite).Error; updateInviteErr != nil {
			api.Logger.Error("Error updating invite", "error", updateInviteErr)
			return updateInviteErr
		}

		// Revoke the existing invite in Clerk
		_, revokeErr := invitation.Revoke(ctx, existingClerkInviteID)
		if revokeErr != nil {
			api.Logger.Error("Error revoking existing invite in Clerk", "error", revokeErr)
			return revokeErr
		}

		return nil
	})

	return transactionErr
}

func (api *APIControllers) InvitesDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.deleteInviteInTransaction(c.Context(), invite)
	if transactionErr != nil {
		api.Logger.Error("Transaction failed for invite deletion", "error", transactionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Invite for %s deleted", invite.Email),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_deleted"),
	})
}

func (api *APIControllers) ResendInvite(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !localeOk || !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.resendInviteInTransaction(c.Context(), invite, locale)
	if transactionErr != nil {
		api.Logger.Error("Transaction failed for invite resend", "error", transactionErr)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Invite for %s resent", invite.Email),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_sent"),
		Data:    inviteResponse,
	})
}

func (api *APIControllers) IndexMyInvites(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Fetch invites by user's email
	invites, err := api.DB.GetInvitesByEmail(user.Email)
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: invitesResponse,
	})
}

func (api *APIControllers) AcceptInvite(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Make sure the user is allowed to accept the invite
	allowed := user.Email == invite.Email // User can accept the invite if it was sent to them
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Update the invite
		acceptedAt := time.Now()
		invite.AcceptedAt = &acceptedAt
		if updateInviteErr := tx.Save(&invite).Error; updateInviteErr != nil {
			api.Logger.Error("Error updating invite", "error", updateInviteErr)
			return updateInviteErr
		}

		// Add the user to the workspace
		_, addUserToWorkspaceErr := api.DB.AddUserToWorkspace(tx, user.ID, invite.WorkspaceID, []uint{invite.RoleID})
		if addUserToWorkspaceErr != nil {
			api.Logger.Error("Error adding user to workspace", "error", addUserToWorkspaceErr)
			return addUserToWorkspaceErr
		}

		return nil
	})

	if transactionErr != nil {
		api.Logger.Error("Transaction failed for invite acceptance", "error", transactionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeCreate,
		Description: fmt.Sprintf(
			"User %s added to workspace %s with role %s",
			user.Email,
			invite.Workspace.Name,
			invite.Role.Role,
		),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_accepted"),
	})
}

func (api *APIControllers) DeclineInvite(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Make sure the user is allowed to decline the invite
	allowed := user.Email == invite.Email // User can decline the invite if it was sent to them
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Update the invite
	declinedAt := time.Now()
	invite.DeclinedAt = &declinedAt
	if updateInviteErr := api.DB.Save(&invite).Error; updateInviteErr != nil {
		api.Logger.Error("Error updating invite", "error", updateInviteErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("User %s declined invite to workspace %s", user.Email, invite.Workspace.Name),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_declined"),
	})
}
