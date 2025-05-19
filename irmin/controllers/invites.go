package controllers

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"github.com/gofiber/fiber/v3"
)

//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other index functions
func (api *APIControllers) WorkspaceInvitesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Fetch invites
	invites, getInvitesByWorkspaceErr := api.DB.GetInvitesByWorkspace(workspace.ID)
	if getInvitesByWorkspaceErr != nil {
		api.Logger.Error("Error fetching invites", "error", getInvitesByWorkspaceErr)
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: invitesResponse,
	})
}

// Helper function to check if user has permission to send invites.
func (api *APIControllers) canSendInvites(user *db.User, workspace *db.Workspace) bool {
	if user.ID == workspace.OwnerID {
		return true
	}
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == workspace.ID {
			for _, role := range userWorkspace.Roles {
				if role == db.RoleAdmin {
					return true
				}
			}
		}
	}
	return false
}

// Helper function to validate invite request fields.
func validateInviteFields(fields map[string]string) error {
	if !utils.ValidateEmail(fields["email"]) {
		return fmt.Errorf("invalid email: %s", fields["email"])
	}
	if fields["role"] != string(db.RoleAdmin) && fields["role"] != string(db.RoleEditor) &&
		fields["role"] != string(db.RoleViewer) {
		return fmt.Errorf("invalid role: %s", fields["role"])
	}
	return nil
}

// Helper function to check for existing invites/users.
func (api *APIControllers) checkExistingInviteOrUser(email string, workspaceID uint) error {
	// Check if user is already in workspace
	alreadyInWorkspace, err := api.DB.IsUserInWorkspaceByEmail(email, workspaceID)
	if err != nil {
		return fmt.Errorf("error checking if user in workspace: %w", err)
	}
	if alreadyInWorkspace {
		return errors.New("user already in workspace")
	}

	// Check if user is already invited
	existingInvites, err := api.DB.GetInvitesByEmail(email)
	if err != nil {
		return fmt.Errorf("error checking existing invites: %w", err)
	}
	for _, invite := range existingInvites {
		if invite.WorkspaceID == workspaceID {
			return errors.New("user already invited to workspace")
		}
	}
	return nil
}

func (api *APIControllers) SendInvite(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	locale, localeOk := c.Locals("locale").(string)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !localeOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check permissions
	if !api.canSendInvites(user, workspace) {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "insufficient_permissions")},
		})
	}

	// Parse and validate request fields
	fields, err := utils.ParseFormFields(c, []string{"email", "role"}, nil)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	if validateInviteFieldsErr := validateInviteFields(fields); validateInviteFieldsErr != nil {
		api.Logger.Error("Invalid invite fields", "error", validateInviteFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Check for existing invites/users
	if checkExistingInviteOrUserErr := api.checkExistingInviteOrUser(fields["email"], workspace.ID); checkExistingInviteOrUserErr != nil {
		switch checkExistingInviteOrUserErr.Error() {
		case "user already in workspace":
			return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "already_in_workspace")},
			})
		case "user already invited to workspace":
			return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "already_invited_to_workspace")},
			})
		default:
			api.Logger.Error("Error checking existing invite/user", "error", checkExistingInviteOrUserErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
	}

	// Set the API key with your Clerk Secret Key.
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Create the invite in the database
	expiresAt := time.Now().Add(time.Duration(api.Env.InviteExpiresInDays) * 24 * time.Hour)
	newInvite := db.Invite{
		Email:       fields["email"],
		ExpiresAt:   expiresAt,
		Role:        db.UserWorkspaceRole(fields["role"]),
		InvitedByID: user.ID,
		WorkspaceID: workspace.ID,
	}
	if createInviteErr := api.DB.Create(&newInvite).Error; createInviteErr != nil {
		api.Logger.Error("Error creating invite", "error", createInviteErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create sqid for the invite
	inviteSqid, encodeInviteSqidErr := api.SQIDManager.Encode("invites", uint64(newInvite.ID))
	if encodeInviteSqidErr != nil {
		api.Logger.Error("Error encoding invite sqid", "error", encodeInviteSqidErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the invite acceptance URL
	inviteAcceptanceURL := fmt.Sprintf(
		"%s/%s/invite/%s",
		api.Env.ConsoleURL,
		locale,
		inviteSqid,
	) // Example: https://console.irmin.dev/en/invite/ng20qJbi669TQlpF

	// Create the invite in Clerk
	expiresInDays := int64(api.Env.InviteExpiresInDays)
	clerkInvite, createClerkInviteErr := invitation.Create(c.Context(), &invitation.CreateParams{
		EmailAddress:  fields["email"],
		RedirectURL:   &inviteAcceptanceURL,
		ExpiresInDays: &expiresInDays,
	})
	if createClerkInviteErr != nil {
		api.Logger.Error("Error creating Clerk invite", "error", createClerkInviteErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update invite with Clerk ID
	newInvite.ClerkID = clerkInvite.ID
	if updateInviteErr := api.DB.Save(&newInvite).Error; updateInviteErr != nil {
		api.Logger.Error("Error updating invite with Clerk ID", "error", updateInviteErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, formatInviteResponseErr := formatter.FormatInviteResponse(&newInvite, api.SQIDManager)
	if formatInviteResponseErr != nil {
		api.Logger.Error("Error formatting invite response", "error", formatInviteResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Invite sent to %s, role: %s", newInvite.Email, newInvite.Role),
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

	// Make sure the user is allowed to send invites
	allowed := user.ID == invite.Workspace.OwnerID // Owner can modify users in the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == invite.Workspace.ID {
			for _, role := range userWorkspace.Roles {
				if role == db.RoleAdmin {
					allowed = true // Admins can modify users in the workspace
					break
				}
			}
		}
	}
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "insufficient_permissions")},
		})
	}

	// Parse the request
	fields, err := utils.ParseFormFields(c, []string{"role"}, nil)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate fields
	if fields["role"] != string(db.RoleAdmin) && fields["role"] != string(db.RoleEditor) &&
		fields["role"] != string(db.RoleViewer) {
		api.Logger.Error("Invalid role", "role", fields["role"])
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update the invite
	invite.Role = db.UserWorkspaceRole(fields["role"])
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
		Description: fmt.Sprintf("Invite for %s updated, role: %s", invite.Email, invite.Role),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "invite_updated"),
		Data:    inviteResponse,
	})
}

func (api *APIControllers) InvitesDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	invite, inviteOk := c.Locals("invite").(*db.Invite)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !inviteOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Create context
	ctx := c.Context()

	// Make sure the user is allowed to send invites
	allowed := user.ID == invite.Workspace.OwnerID // Owner can modify users in the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == invite.Workspace.ID {
			for _, role := range userWorkspace.Roles {
				if role == db.RoleAdmin {
					allowed = true // Admins can modify users in the workspace
					break
				}
			}
		}
	}
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "insufficient_permissions")},
		})
	}

	// Revoke the invite in Clerk
	_, err := invitation.Revoke(ctx, invite.ClerkID)
	if err != nil {
		api.Logger.Error("Error revoking invite in Clerk", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Delete the invite
	err = api.DB.DeleteInvite(invite.ID)
	if err != nil {
		api.Logger.Error("Error deleting invite", "error", err)
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

	// Create context
	ctx := c.Context()

	// Make sure the user is allowed to send invites
	allowed := user.ID == invite.Workspace.OwnerID // Owner can modify users in the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == invite.Workspace.ID {
			for _, role := range userWorkspace.Roles {
				if role == db.RoleAdmin {
					allowed = true // Admins can modify users in the workspace
					break
				}
			}
		}
	}
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "insufficient_permissions")},
		})
	}

	// Create sqid for the invite
	inviteSqid, err := api.SQIDManager.Encode("invites", uint64(invite.ID))
	if err != nil {
		api.Logger.Error("Error encoding invite sqid", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the API key with your Clerk Secret Key.
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Revoke the existing invite in Clerk
	_, err = invitation.Revoke(ctx, invite.ClerkID)
	if err != nil {
		api.Logger.Error("Error revoking existing invite in Clerk", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create new invite in Clerk
	inviteAcceptanceURL := fmt.Sprintf(
		"%s/%s/invite/%s",
		api.Env.ConsoleURL,
		locale,
		inviteSqid,
	) // Example: https://console.irmin.dev/en/invite/ng20qJbi669TQlpF
	expiresInDays := int64(api.Env.InviteExpiresInDays)
	clerkInvite, err := invitation.Create(ctx, &invitation.CreateParams{
		EmailAddress:  invite.Email,
		RedirectURL:   &inviteAcceptanceURL,
		ExpiresInDays: &expiresInDays,
	})
	if err != nil {
		api.Logger.Error("Error creating Clerk invite", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update the invite with the Clerk ID and the new expiration date
	expiresAt := time.Now().Add(time.Duration(api.Env.InviteExpiresInDays) * 24 * time.Hour)
	invite.ClerkID = clerkInvite.ID
	invite.ExpiresAt = expiresAt
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
			Errors: []string{api.lm.T(dict, "insufficient_permissions")},
		})
	}

	// Update the invite
	acceptedAt := time.Now()
	invite.AcceptedAt = &acceptedAt
	if updateInviteErr := api.DB.Save(&invite).Error; updateInviteErr != nil {
		api.Logger.Error("Error updating invite", "error", updateInviteErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Add the user to the workspace
	_, addUserToWorkspaceErr := api.DB.AddUserToWorkspace(
		user.ID,
		invite.WorkspaceID,
		[]db.UserWorkspaceRole{invite.Role},
	)
	if addUserToWorkspaceErr != nil {
		api.Logger.Error("Error adding user to workspace", "error", addUserToWorkspaceErr)
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
			invite.Role,
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
			Errors: []string{api.lm.T(dict, "insufficient_permissions")},
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
