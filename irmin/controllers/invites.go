package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/lib/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"github.com/gofiber/fiber/v3"
)

func WorkspaceInvitesIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Fetch invites
	invites, err := db.GetInvitesByWorkspace(workspace.ID)
	if err != nil {
		log.Printf("Error fetching invites: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Prepare response
	var invitesResponse []db.InviteResponse
	for _, invite := range invites {
		// Format the invite
		inviteResponse, err := formatter.FormatInviteResponse(&invite)
		if err != nil {
			log.Printf("Error formatting invite response: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		// Append to response
		invitesResponse = append(invitesResponse, *inviteResponse)
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: invitesResponse,
	})
}

func SendInvite(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	locale := c.Locals("locale").(string)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)

	// Create context
	ctx := c.Context()

	// Make sure the user is allowed to send invites
	allowed := user.ID == workspace.OwnerID // Owner can modify users in the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == workspace.ID {
			for _, role := range userWorkspace.Roles {
				if role == db.RoleAdmin {
					allowed = true // Admins can modify users in the workspace
					break
				}
			}
		}
	}
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Parse the request
	fields, err := utils.ParseFormFields(c, []string{"email", "role"}, nil)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Validate fields
	if !utils.ValidateEmail(fields["email"]) {
		log.Printf("Invalid email: %s", fields["email"])
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}
	if fields["role"] != string(db.RoleAdmin) && fields["role"] != string(db.RoleEditor) && fields["role"] != string(db.RoleViewer) {
		log.Printf("Invalid role: %s", fields["role"])
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Make sure the user is not already in the workspace
	alreadyInWorkspace, err := db.IsUserInWorkspaceByEmail(fields["email"], workspace.ID)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	if alreadyInWorkspace {
		return utils.WriteResponse(c, fiber.StatusConflict, utils.IrminAPIResponse{
			Errors: []string{dict.T("already_in_workspace")},
		})
	}

	// Make sure the user is not already invited to the workspace
	existingInvites, err := db.GetInvitesByEmail(fields["email"])
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	for _, invite := range existingInvites {
		if invite.WorkspaceID == workspace.ID {
			return utils.WriteResponse(c, fiber.StatusConflict, utils.IrminAPIResponse{
				Errors: []string{dict.T("already_invited_to_workspace")},
			})
		}
	}

	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		log.Printf("Error loading environment variables: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the API key with your Clerk Secret Key.
	clerk.SetKey(env.ClerkSecretKey)

	// Create the invite in the database
	expiresAt := time.Now().Add(time.Duration(env.InviteExpiresInDays) * 24 * time.Hour)
	newInvite, err := db.CreateInvite(&db.Invite{
		Email:       fields["email"],
		ExpiresAt:   expiresAt,
		Role:        db.UserWorkspaceRole(fields["role"]),
		InvitedByID: user.ID,
		WorkspaceID: workspace.ID,
	})
	if err != nil {
		log.Printf("Error creating invite in the database: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create sqid for the invite
	inviteSqid, err := utils.EncodeSqids("invites", uint64(newInvite.ID))
	if err != nil {
		log.Printf("Error encoding invite sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send invite in Clerk
	inviteAcceptanceUrl := fmt.Sprintf("%s/%s/invite/%s", env.ConsoleURL, locale, inviteSqid) // Example: https://console.irmin.dev/en/invite/ng20qJbi669TQlpF
	expiresInDays := int64(env.InviteExpiresInDays)
	clerkInvite, err := invitation.Create(ctx, &invitation.CreateParams{
		EmailAddress:  fields["email"],
		RedirectURL:   &inviteAcceptanceUrl,
		ExpiresInDays: &expiresInDays,
	})
	if err != nil {
		log.Printf("Error creating Clerk invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Update the invite with the Clerk ID
	newInvite, err = db.UpdateInvite(newInvite.ID, map[string]any{
		"clerk_id": clerkInvite.ID,
	})
	if err != nil {
		log.Printf("Error updating invite with Clerk ID: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Fetch the newly created invite
	newInvite, err = db.GetInviteByID(newInvite.ID)
	if err != nil {
		log.Printf("Error fetching newly created invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, err := formatter.FormatInviteResponse(newInvite)
	if err != nil {
		log.Printf("Error formatting invite response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusCreated, utils.IrminAPIResponse{
		Message: dict.T("invite_sent"),
		Data:    inviteResponse,
	})
}

func InvitesShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	invite := c.Locals("invite").(*db.Invite)

	// Format the invite
	inviteResponse, err := formatter.FormatInviteResponse(invite)
	if err != nil {
		log.Printf("Error formatting invite response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusCreated, utils.IrminAPIResponse{
		Data: inviteResponse,
	})
}

func InvitesUpdate(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	invite := c.Locals("invite").(*db.Invite)
	user := c.Locals("user").(*db.User)

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
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Parse the request
	fields, err := utils.ParseFormFields(c, []string{"role"}, nil)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Validate fields
	if fields["role"] != string(db.RoleAdmin) && fields["role"] != string(db.RoleEditor) && fields["role"] != string(db.RoleViewer) {
		log.Printf("Invalid role: %s", fields["role"])
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Update the invite
	updatedInvite, err := db.UpdateInvite(invite.ID, map[string]any{
		"role": fields["role"],
	})
	if err != nil {
		log.Printf("Error updating invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, err := formatter.FormatInviteResponse(updatedInvite)
	if err != nil {
		log.Printf("Error formatting invite response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("invite_updated"),
		Data:    inviteResponse,
	})
}

func InvitesDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	invite := c.Locals("invite").(*db.Invite)
	user := c.Locals("user").(*db.User)

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
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Revoke the invite in Clerk
	_, err := invitation.Revoke(ctx, invite.ClerkID)
	if err != nil {
		log.Printf("Error revoking invite in Clerk: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Delete the invite
	err = db.DeleteInvite(invite.ID)
	if err != nil {
		log.Printf("Error deleting invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("invite_deleted"),
	})
}

func ResendInvite(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	invite := c.Locals("invite").(*db.Invite)
	user := c.Locals("user").(*db.User)

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
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		log.Printf("Error loading environment variables: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create sqid for the invite
	inviteSqid, err := utils.EncodeSqids("invites", uint64(invite.ID))
	if err != nil {
		log.Printf("Error encoding invite sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the API key with your Clerk Secret Key.
	clerk.SetKey(env.ClerkSecretKey)

	// Revoke the existing invite in Clerk
	_, err = invitation.Revoke(ctx, invite.ClerkID)
	if err != nil {
		log.Printf("Error revoking existing invite in Clerk: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create new invite in Clerk
	inviteAcceptanceUrl := fmt.Sprintf("%s/%s/invite/%s", env.ConsoleURL, locale, inviteSqid) // Example: https://console.irmin.dev/en/invite/ng20qJbi669TQlpF
	expiresInDays := int64(env.InviteExpiresInDays)
	clerkInvite, err := invitation.Create(ctx, &invitation.CreateParams{
		EmailAddress:  invite.Email,
		RedirectURL:   &inviteAcceptanceUrl,
		ExpiresInDays: &expiresInDays,
	})
	if err != nil {
		log.Printf("Error creating Clerk invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Update the invite with the Clerk ID and the new expiration date
	expiresAt := time.Now().Add(time.Duration(env.InviteExpiresInDays) * 24 * time.Hour)
	updatedInvite, err := db.UpdateInvite(invite.ID, map[string]any{
		"clerk_id":   clerkInvite.ID,
		"expires_at": expiresAt,
	})
	if err != nil {
		log.Printf("Error updating invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the invite
	inviteResponse, err := formatter.FormatInviteResponse(updatedInvite)
	if err != nil {
		log.Printf("Error formatting invite response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("invite_sent"),
		Data:    inviteResponse,
	})
}

func IndexMyInvites(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Fetch invites by user's email
	invites, err := db.GetInvitesByEmail(user.Email)
	if err != nil {
		log.Printf("Error fetching invites: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Prepare response
	var invitesResponse []db.InviteResponse
	for _, invite := range invites {
		// Format the invite
		inviteResponse, err := formatter.FormatInviteResponse(&invite)
		if err != nil {
			log.Printf("Error formatting invite response: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		// Append to response
		invitesResponse = append(invitesResponse, *inviteResponse)
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: invitesResponse,
	})
}

func AcceptInvite(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	invite := c.Locals("invite").(*db.Invite)
	user := c.Locals("user").(*db.User)

	// Make sure the user is allowed to accept the invite
	allowed := user.Email == invite.Email // User can accept the invite if it was sent to them
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Update the invite
	_, err := db.UpdateInvite(invite.ID, map[string]any{
		"accepted_at": time.Now(),
	})
	if err != nil {
		log.Printf("Error updating invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Add the user to the workspace
	_, err = db.AddUserToWorkspace(user.ID, invite.WorkspaceID, []db.UserWorkspaceRole{invite.Role})
	if err != nil {
		log.Printf("Error adding user to workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("invite_accepted"),
	})
}

func DeclineInvite(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	invite := c.Locals("invite").(*db.Invite)
	user := c.Locals("user").(*db.User)

	// Make sure the user is allowed to decline the invite
	allowed := user.Email == invite.Email // User can decline the invite if it was sent to them
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Update the invite
	_, err := db.UpdateInvite(invite.ID, map[string]any{
		"declined_at": time.Now(),
	})
	if err != nil {
		log.Printf("Error updating invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("invite_declined"),
	})
}
