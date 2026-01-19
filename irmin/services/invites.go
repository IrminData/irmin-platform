package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"gorm.io/gorm"
)

// GetInviteForMiddleware retrieves an invite by SQID and performs basic access checks.
// This method is used by the middleware to load the invite without requiring workspace context.
// It returns both the invite and its associated workspace for setting in context.
func (api *APIServices) GetInviteForMiddleware(
	c context.Context,
	user *db.User,
	inviteSqid string,
) (*db.Invite, *db.Workspace, error) {
	// Get the invite by ID.
	inviteID, err := api.SQIDManager.Decode("invites", inviteSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding invite sqid", "error", err)
		return nil, nil, NewInternalErrorf("error decoding invite SQID: %w", err)
	}

	// Get the invite by ID (includes workspace preload).
	invite, err := api.DB.GetInviteByID(uint(inviteID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching invite", "error", err)
		return nil, nil, NewInternalErrorf("error fetching invite: %w", err)
	}

	// Check if the invite is valid.
	if invite == nil {
		return nil, nil, ErrNotFound
	}

	// Make sure the invite is either to the user or the user has access to the workspace.
	hasAccess := invite.Email == user.Email
	if !hasAccess {
		// Check if the user is a member of the workspace via database query.
		// This is more reliable than checking preloaded workspaces which may not be loaded
		// (e.g., when using API token authentication).
		isInWorkspace, getIsInWorkspaceErr := api.DB.IsUserInWorkspace(user.ID, invite.WorkspaceID)
		if getIsInWorkspaceErr != nil {
			api.Logger.ErrorContext(c, "Error checking workspace membership", "error", getIsInWorkspaceErr)
			return nil, nil, NewInternalErrorf("error checking workspace membership: %w", getIsInWorkspaceErr)
		}
		hasAccess = isInWorkspace
	}
	if !hasAccess {
		return nil, nil, ErrInviteNotAllowed
	}

	return invite, &invite.Workspace, nil
}

func (api *APIServices) GetInviteByID(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	inviteSqid string,
) (*db.Invite, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceInvite,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, ErrAccessDenied
	}
	if !isAllowed {
		api.Logger.ErrorContext(c, "User is not allowed to get invite", "user", user.Email, "invite", inviteSqid)
		return nil, ErrAccessDenied
	}

	// Get the invite by ID.
	inviteID, err := api.SQIDManager.Decode("invites", inviteSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding invite sqid", "error", err)
		return nil, NewInternalErrorf("error decoding invite SQID: %w", err)
	}

	// Get the invite by ID.
	invite, err := api.DB.GetInviteByID(uint(inviteID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching invite", "error", err)
		return nil, NewInternalErrorf("error fetching invite: %w", err)
	}

	// Check if the invite is valid.
	if invite == nil {
		return nil, ErrNotFound
	}

	// Make sure the invite was not yet accepted or declined
	if invite.AcceptedAt != nil || invite.DeclinedAt != nil {
		return nil, ErrInviteAlreadyAcceptedOrDeclined
	}

	// Make sure the invite is not expired
	if invite.ExpiresAt.Before(time.Now()) {
		return nil, ErrInviteExpired
	}

	// Make sure the invite is either to the workspace user has access to or to the user.
	hasAccess := invite.Email == user.Email
	for _, workspaceUser := range user.Workspaces {
		if workspaceUser.WorkspaceID == invite.WorkspaceID {
			hasAccess = true
			break
		}
	}
	if !hasAccess {
		return nil, ErrInviteNotAllowed
	}

	return invite, nil
}

// ListInvitesToWorkspace lists all invites to a workspace.
func (api *APIServices) ListInvitesToWorkspace(
	c context.Context,
	workspace *db.Workspace,
	user *db.User,
) ([]db.Invite, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceInvite,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to list invites to workspace",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Get all invites in the workspace.
	invites, getInvitesErr := api.DB.GetActiveInvitesByWorkspace(
		workspace.ID,
	) // This query will get only active invites.
	if getInvitesErr != nil {
		api.Logger.ErrorContext(c, "Error fetching invites", "error", getInvitesErr)
		return nil, NewInternalErrorf("error fetching invites: %w", getInvitesErr)
	}

	// Filter invites based on user permissions
	filteredInvites, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceInvite,
		db.PolicyActionRead,
		invites,
		func(i db.Invite) uint { return i.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering invites by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering invites by permissions: %w", err)
	}

	return filteredInvites, nil
}

// ListInvitesForUser lists all invites for a user.
func (api *APIServices) ListInvitesForUser(
	c context.Context,
	user *db.User,
) ([]db.Invite, error) {
	// No permission check needed, since this is only used for the user to see their own invites

	// Fetch invites by user's email
	invites, err := api.DB.GetInvitesByEmail(user.Email)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching invites", "error", err)
		return nil, NewInternalErrorf("error fetching invites: %w", err)
	}

	return invites, nil
}

// InviteTransactionResult contains the result of invitation creation including notification status.
type InviteTransactionResult struct {
	Invite             *db.Invite                    `json:"invite"`
	ClerkInviteCreated bool                          `json:"clerk_invite_created"`
	NotificationResult *lib.InviteNotificationResult `json:"notification_result,omitempty"`
}

// sendInviteInTransaction handles the transactional creation of invites in both database and Clerk.
func (api *APIServices) sendInviteInTransaction(
	ctx context.Context,
	req irmincore.SendInviteRequest,
	role *db.Role,
	user *db.User,
	workspace *db.Workspace,
	locale string,
) (*InviteTransactionResult, error) {
	var newInvite *db.Invite
	var clerkInvite *clerk.Invitation
	var clerkInviteCreated = false
	var inviteAcceptanceURL string

	// Use database transaction to ensure atomicity for database operations
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
		if createInviteErr := tx.Create(newInvite).Error; createInviteErr != nil {
			api.Logger.ErrorContext(ctx, "Error creating invite", "error", createInviteErr)
			return NewInternalErrorf("error creating invite: %w", createInviteErr)
		}

		// Create sqid for the invite
		inviteSqid, encodeInviteSqidErr := api.SQIDManager.Encode("invites", uint64(newInvite.ID))
		if encodeInviteSqidErr != nil {
			api.Logger.ErrorContext(ctx, "Error encoding invite sqid", "error", encodeInviteSqidErr)
			return NewInternalErrorf("error encoding invite SQID: %w", encodeInviteSqidErr)
		}

		// Create the invite acceptance URL
		inviteAcceptanceURL = fmt.Sprintf(
			"%s/%s/invite/%s",
			api.Env.ConsoleURL,
			locale,
			inviteSqid,
		)

		return nil
	})

	// If database transaction failed, return error
	if transactionErr != nil {
		return nil, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}

	// Try to create the invite in Clerk (outside of database transaction)
	clerk.SetKey(api.Env.ClerkSecretKey)
	expiresInDays := int64(api.Env.InviteExpiresInDays)
	clerkInvite, createClerkInviteErr := invitation.Create(ctx, &invitation.CreateParams{
		EmailAddress:  req.Email,
		RedirectURL:   &inviteAcceptanceURL,
		ExpiresInDays: &expiresInDays,
	})

	if createClerkInviteErr != nil {
		api.Logger.WarnContext(ctx, "Clerk invitation creation failed, will use fallback notifications",
			"error", createClerkInviteErr,
			"email", req.Email)

		// Don't fail the entire process if Clerk fails
		clerkInviteCreated = false
	} else {
		// Update invite with Clerk ID in a separate transaction
		updateErr := api.DB.Transaction(func(tx *gorm.DB) error {
			newInvite.ClerkID = clerkInvite.ID
			if saveErr := tx.Save(newInvite).Error; saveErr != nil {
				return NewInternalErrorf("error updating invite with Clerk ID: %w", saveErr)
			}
			return nil
		})

		if updateErr != nil {
			api.Logger.ErrorContext(ctx, "Error updating invite with Clerk ID", "error", updateErr)
			// Continue anyway since the invite exists in database
		} else {
			clerkInviteCreated = true
			api.Logger.InfoContext(ctx, "Clerk invitation created successfully", "email", req.Email, "clerk_id", clerkInvite.ID)
		}
	}

	// If Clerk invitation failed, send fallback notification
	var notificationResult *lib.InviteNotificationResult
	if !clerkInviteCreated {
		// Prepare notification parameters
		notificationParams := lib.InviteNotificationParams{
			Invite:              newInvite,
			Workspace:           workspace,
			InvitedBy:           user,
			Role:                role,
			InviteAcceptanceURL: inviteAcceptanceURL,
			Locale:              locale,
		}

		// Send fallback notification
		notificationResult = lib.SendFallbackInviteNotification(
			ctx,
			api.DB,
			api.SQIDManager,
			api.Env,
			api.Logger,
			notificationParams,
		)

		api.Logger.InfoContext(ctx, "Fallback notification attempted",
			"email", req.Email,
			"method", notificationResult.Method,
			"success", notificationResult.Success)
	}

	return &InviteTransactionResult{
		Invite:             newInvite,
		ClerkInviteCreated: clerkInviteCreated,
		NotificationResult: notificationResult,
	}, nil
}

// SendInvite sends an invite to a user.
func (api *APIServices) SendInvite(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.SendInviteRequest,
) (*InviteTransactionResult, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceInvite,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to send invite",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"invite",
			req.Email,
		)
		return nil, ErrAccessDenied
	}

	// Check if user is already in workspace
	alreadyInWorkspace, err := api.DB.IsUserInWorkspaceByEmail(req.Email, workspace.ID)
	if err != nil {
		return nil, NewInternalErrorf("error checking if user is in workspace: %w", err)
	}
	if alreadyInWorkspace {
		return nil, ErrUserAlreadyInWorkspace
	}

	// Check if user is already invited
	existingInvites, err := api.DB.GetInvitesByEmail(req.Email)
	if err != nil {
		return nil, NewInternalErrorf("error fetching existing invites: %w", err)
	}
	for _, invite := range existingInvites {
		if invite.WorkspaceID == workspace.ID {
			return nil, ErrUserAlreadyInvitedToWorkspace
		}
	}

	// Decode the role id
	roleID, err := api.SQIDManager.Decode("roles", req.Role)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding role", "error", err)
		return nil, ErrInvalidRole
	}

	// Get the role by ID
	role, err := api.DB.GetRole(uint(roleID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting role", "error", err)
		return nil, err
	}
	if role == nil {
		api.Logger.ErrorContext(c, "Role not found", "role", req.Role)
		return nil, ErrInvalidRole
	}

	// Send the invite.
	inviteResult, err := api.sendInviteInTransaction(c, req, role, user, workspace, locale)
	if err != nil {
		return nil, NewInternalErrorf("error sending invite: %w", err)
	}

	// Create audit log description based on notification method used
	auditDescription := fmt.Sprintf("Invite sent to %s, role: %s", inviteResult.Invite.Email, role.Role)
	if inviteResult.ClerkInviteCreated {
		auditDescription += " (via Clerk)"
	} else if inviteResult.NotificationResult != nil {
		auditDescription += fmt.Sprintf(" (via %s)", inviteResult.NotificationResult.Method)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: auditDescription,
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return inviteResult, nil
}

// UpdateInvite updates an invite.
func (api *APIServices) UpdateInvite(
	c context.Context,
	user *db.User,
	invite *db.Invite,
	req irmincore.UpdateInviteRequest,
) (*db.Invite, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		&invite.Workspace,
		db.PolicyResourceInvite,
		&invite.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update invite",
			"user",
			user.Email,
			"workspace",
			invite.Workspace.Slug,
			"invite",
			invite.Email,
		)
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if req.Role == "" {
		return nil, ErrInvalidRole
	}

	// Parse the role id
	roleID, err := api.SQIDManager.Decode("roles", req.Role)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding role", "error", err)
		return nil, ErrInvalidRole
	}

	// Get the role by ID
	role, err := api.DB.GetRole(uint(roleID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting role", "error", err)
		return nil, NewInternalErrorf("error getting role: %w", err)
	}
	if role == nil {
		api.Logger.ErrorContext(c, "Role not found", "role", req.Role)
		return nil, ErrInvalidRole
	}

	// Update the invite
	invite.RoleID = role.ID
	if updateInviteErr := api.DB.Save(invite).Error; updateInviteErr != nil {
		api.Logger.ErrorContext(c, "Error updating invite", "error", updateInviteErr)
		return nil, NewInternalErrorf("error updating invite: %w", updateInviteErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Invite for %s updated, role: %s", invite.Email, role.Role),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	return invite, nil
}

// deleteInviteInTransaction handles the transactional deletion of invites from both Clerk and database.
func (api *APIServices) deleteInviteInTransaction(
	ctx context.Context,
	invite *db.Invite,
) error {
	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Revoke the invite in Clerk first (only if it has a ClerkID)
		if invite.ClerkID != "" {
			_, revokeErr := invitation.Revoke(ctx, invite.ClerkID)
			if revokeErr != nil {
				api.Logger.ErrorContext(ctx, "Error revoking invite in Clerk", "error", revokeErr)
				return revokeErr
			}
		} else {
			api.Logger.InfoContext(ctx, "Skipping Clerk invite revocation - invite was not created in Clerk", "email", invite.Email)
		}

		// Delete the invite from database
		if deleteErr := tx.Delete(&db.Invite{}, invite.ID).Error; deleteErr != nil {
			api.Logger.ErrorContext(ctx, "Error deleting invite from database", "error", deleteErr)
			return deleteErr
		}

		return nil
	})

	return transactionErr
}

// DeleteInvite deletes an invite.
func (api *APIServices) DeleteInvite(c context.Context, user *db.User, invite *db.Invite) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		&invite.Workspace,
		db.PolicyResourceInvite,
		&invite.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete invite",
			"user",
			user.Email,
			"workspace",
			invite.Workspace.Slug,
			"invite",
			invite.Email,
		)
		return ErrAccessDenied
	}

	// Make sure that the invite is not accepted or declined
	if invite.AcceptedAt != nil || invite.DeclinedAt != nil {
		return ErrInviteAlreadyAcceptedOrDeclined
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.deleteInviteInTransaction(c, invite)
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Transaction failed for invite deletion", "error", transactionErr)
		return transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Invite for %s deleted", invite.Email),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	return nil
}

// resendInviteInTransaction handles the transactional resending of invites (revoke old + create new).
func (api *APIServices) resendInviteInTransaction(
	ctx context.Context,
	invite *db.Invite,
	locale string,
) error {
	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create sqid for the invite
		inviteSqid, err := api.SQIDManager.Encode("invites", uint64(invite.ID))
		if err != nil {
			api.Logger.ErrorContext(ctx, "Error encoding invite sqid", "error", err)
			return err
		}

		// Set the API key with your Clerk Secret Key.
		clerk.SetKey(api.Env.ClerkSecretKey)

		// Revoke the existing invite in Clerk first (only if it has a ClerkID)
		// This must happen before creating a new invite, otherwise Clerk will reject
		// the new invite because a pending invite already exists for that email.
		if invite.ClerkID != "" {
			_, revokeErr := invitation.Revoke(ctx, invite.ClerkID)
			if revokeErr != nil {
				api.Logger.ErrorContext(ctx, "Error revoking existing invite in Clerk", "error", revokeErr)
				return revokeErr
			}
		} else {
			api.Logger.InfoContext(ctx, "Skipping Clerk invite revocation - original invite was not created in Clerk", "email", invite.Email)
		}

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
			api.Logger.ErrorContext(ctx, "Error creating Clerk invite", "error", createClerkInviteErr)
			return createClerkInviteErr
		}

		// Update the invite with the new Clerk ID and expiration date
		expiresAt := time.Now().Add(time.Duration(api.Env.InviteExpiresInDays) * 24 * time.Hour)
		invite.ClerkID = clerkInvite.ID
		invite.ExpiresAt = expiresAt
		if updateInviteErr := tx.Save(invite).Error; updateInviteErr != nil {
			api.Logger.ErrorContext(ctx, "Error updating invite", "error", updateInviteErr)
			return updateInviteErr
		}

		return nil
	})

	return transactionErr
}

func (api *APIServices) ResendInvite(c context.Context, locale string, user *db.User, invite *db.Invite) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		&invite.Workspace,
		db.PolicyResourceInvite,
		&invite.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to resend invite",
			"user",
			user.Email,
			"workspace",
			invite.Workspace.Slug,
			"invite",
			invite.Email,
		)
		return ErrAccessDenied
	}

	// Make sure that the invite is not expired, accepted or declined
	if invite.ExpiresAt.Before(time.Now()) {
		return ErrInviteExpired
	}

	// Make sure that the invite is not already accepted or declined
	if invite.AcceptedAt != nil || invite.DeclinedAt != nil {
		return ErrInviteAlreadyAcceptedOrDeclined
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.resendInviteInTransaction(c, invite, locale)
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Transaction failed for invite resend", "error", transactionErr)
		return transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Invite for %s resent", invite.Email),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	return nil
}

func (api *APIServices) AcceptInvite(c context.Context, user *db.User, invite *db.Invite) error {
	// Make sure the user is allowed to accept the invite
	allowed := user.Email == invite.Email // User can accept the invite if it was sent to them
	if !allowed {
		return ErrInviteNotAllowed
	}

	// Make sure that the invite is not expired, accepted or declined
	if invite.ExpiresAt.Before(time.Now()) {
		return ErrInviteExpired
	}
	if invite.AcceptedAt != nil || invite.DeclinedAt != nil {
		return ErrInviteAlreadyAcceptedOrDeclined
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Update the invite
		acceptedAt := time.Now()
		invite.AcceptedAt = &acceptedAt
		if updateInviteErr := tx.Save(invite).Error; updateInviteErr != nil {
			api.Logger.ErrorContext(c, "Error updating invite", "error", updateInviteErr)
			return updateInviteErr
		}

		// Add the user to the workspace
		_, addUserToWorkspaceErr := api.DB.AddUserToWorkspace(tx, user.ID, invite.WorkspaceID, []uint{invite.RoleID})
		if addUserToWorkspaceErr != nil {
			api.Logger.ErrorContext(c, "Error adding user to workspace", "error", addUserToWorkspaceErr)
			return addUserToWorkspaceErr
		}

		return nil
	})

	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Transaction failed for invite acceptance", "error", transactionErr)
		return transactionErr
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

	return nil
}

func (api *APIServices) DeclineInvite(c context.Context, user *db.User, invite *db.Invite) error {
	// Make sure the user is allowed to decline the invite
	allowed := user.Email == invite.Email // User can decline the invite if it was sent to them
	if !allowed {
		return ErrInviteNotAllowed
	}

	// Make sure that the invite is not expired, accepted or declined
	if invite.ExpiresAt.Before(time.Now()) {
		return ErrInviteExpired
	}
	if invite.AcceptedAt != nil || invite.DeclinedAt != nil {
		return ErrInviteAlreadyAcceptedOrDeclined
	}

	// Update the invite
	declinedAt := time.Now()
	invite.DeclinedAt = &declinedAt
	if updateInviteErr := api.DB.Save(invite).Error; updateInviteErr != nil {
		api.Logger.ErrorContext(c, "Error updating invite", "error", updateInviteErr)
		return updateInviteErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("User %s declined invite to workspace %s", user.Email, invite.Workspace.Name),
		UserID:      &user.ID,
		WorkspaceID: &invite.WorkspaceID,
	})

	return nil
}
