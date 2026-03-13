package services

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

	// Make sure the invite is not yet accepted or declined
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

// checkMemberLimitTx checks the seat limit inside a transaction with a workspace row lock.
// Returns nil if the invite is allowed, ErrMemberLimitReached if the limit is exceeded.
// Free users: max 1 member. Subscribers: unlimited.
func (api *APIServices) checkMemberLimitTx(ctx context.Context, tx *gorm.DB, workspaceID uint) error {
	if api.BillingService == nil || !api.BillingService.IsEnabled() {
		return nil
	}

	// Lock the workspace row to serialize concurrent invite attempts
	var ws db.Workspace
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", workspaceID).First(&ws).Error; err != nil {
		return NewInternalErrorf("error locking workspace for member limit check: %w", err)
	}

	plan, err := api.BillingService.GetCurrentPlan(workspaceID)
	if err != nil {
		api.Logger.ErrorContext(ctx, "Error getting plan for member limit", "error", err)
		return nil // fail open
	}

	// Subscribers have unlimited seats
	if plan.HasPaymentMethod {
		return nil
	}

	// Free users: 1 member (the owner) + FreeExtraSeats additional members allowed.
	var memberCount, inviteCount int64
	if countErr := tx.Model(&db.WorkspaceUser{}).
		Where("workspace_id = ?", workspaceID).
		Count(&memberCount).Error; countErr != nil {
		return NewInternalErrorf("error counting workspace members: %w", countErr)
	}
	if countErr := tx.Model(&db.Invite{}).
		Where("workspace_id = ? AND accepted_at IS NULL AND declined_at IS NULL AND expires_at > ?",
			workspaceID, time.Now()).
		Count(&inviteCount).Error; countErr != nil {
		return NewInternalErrorf("error counting pending invites: %w", countErr)
	}

	maxMembers := int64(1 + db.FreeExtraSeats)
	if memberCount+inviteCount >= maxMembers {
		return ErrMemberLimitReached
	}
	return nil
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
	var clerkInviteCreated = false
	var inviteAcceptanceURL string

	// Use database transaction to ensure atomicity for database operations
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Check member limit inside the transaction with a row lock to prevent races
		if limitErr := api.checkMemberLimitTx(ctx, tx, workspace.ID); limitErr != nil {
			return limitErr
		}

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

	// If database transaction failed, return error.
	// Pass through sentinel errors (e.g., ErrMemberLimitReached) without wrapping
	// so the error-to-status mapping in errors.go works correctly.
	if transactionErr != nil {
		if errors.Is(transactionErr, ErrMemberLimitReached) {
			return nil, ErrMemberLimitReached
		}
		return nil, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}

	// Check if the invitee already has an Irmin account.
	// Existing users get Novu in-app + email notifications.
	// New users (no account) get a Clerk invitation to create their account.
	existingUser, userLookupErr := api.DB.GetUserByEmail(req.Email)
	if userLookupErr != nil {
		api.Logger.ErrorContext(ctx, "Error looking up invitee by email, treating as new user",
			"email", req.Email, "error", userLookupErr)
	}
	notificationParams := lib.InviteNotificationParams{
		Invite:              newInvite,
		Workspace:           workspace,
		InvitedBy:           user,
		Role:                role,
		InviteAcceptanceURL: inviteAcceptanceURL,
		Locale:              locale,
	}

	var notificationResult *lib.InviteNotificationResult
	if existingUser != nil {
		notificationResult = api.notifyExistingUser(ctx, notificationParams)
	} else {
		notificationResult, clerkInviteCreated = api.sendNewUserInvite(ctx, newInvite, inviteAcceptanceURL, notificationParams)
	}

	// Populate relations so the response formatter has complete data
	newInvite.Role = *role
	newInvite.InvitedBy = *user
	newInvite.Workspace = *workspace

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
		if errors.Is(err, ErrMemberLimitReached) {
			return nil, ErrMemberLimitReached
		}
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
	invite.Role = *role
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

// deleteInviteWithClerkRevoke revokes the Clerk invite (best-effort) and deletes the invite from the database.
func (api *APIServices) deleteInviteWithClerkRevoke(
	ctx context.Context,
	invite *db.Invite,
) error {
	// Revoke the invite in Clerk (best-effort — don't block DB deletion on Clerk failure)
	if invite.ClerkID != "" {
		clerk.SetKey(api.Env.ClerkSecretKey)
		_, revokeErr := invitation.Revoke(ctx, invite.ClerkID)
		if revokeErr != nil {
			api.Logger.ErrorContext(ctx, "Error revoking invite in Clerk (proceeding with deletion)",
				"error", revokeErr, "clerk_id", invite.ClerkID, "email", invite.Email)
		}
	} else {
		api.Logger.InfoContext(ctx, "Skipping Clerk invite revocation - invite was not created in Clerk",
			"email", invite.Email)
	}

	// Delete the invite from database
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
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
	transactionErr := api.deleteInviteWithClerkRevoke(c, invite)
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

// resendInviteWithNotification handles resending invites: revokes old Clerk invite, creates new one, and sends notifications.
func (api *APIServices) resendInviteWithNotification(
	ctx context.Context,
	invite *db.Invite,
	locale string,
) error {
	// Create sqid for the invite
	inviteSqid, err := api.SQIDManager.Encode("invites", uint64(invite.ID))
	if err != nil {
		api.Logger.ErrorContext(ctx, "Error encoding invite sqid", "error", err)
		return err
	}

	inviteAcceptanceURL := fmt.Sprintf(
		"%s/%s/invite/%s",
		api.Env.ConsoleURL,
		locale,
		inviteSqid,
	)

	// Update the invite expiration before sending notifications so the payload
	// contains the new date, not the old one.
	invite.ExpiresAt = time.Now().Add(time.Duration(api.Env.InviteExpiresInDays) * 24 * time.Hour)
	if saveErr := api.DB.Save(invite).Error; saveErr != nil {
		api.Logger.ErrorContext(ctx, "Error updating invite on resend", "error", saveErr)
		return saveErr
	}

	// Check if the invitee already has an Irmin account
	existingUser, userLookupErr := api.DB.GetUserByEmail(invite.Email)
	if userLookupErr != nil {
		api.Logger.ErrorContext(ctx, "Error looking up invitee by email on resend, treating as new user",
			"email", invite.Email, "error", userLookupErr)
	}
	originalInviter := &invite.InvitedBy
	notificationParams := lib.InviteNotificationParams{
		Invite:              invite,
		Workspace:           &invite.Workspace,
		InvitedBy:           originalInviter,
		Role:                &invite.Role,
		InviteAcceptanceURL: inviteAcceptanceURL,
		Locale:              locale,
	}

	if existingUser != nil {
		// Existing user: send Novu in-app + email
		api.notifyExistingUser(ctx, notificationParams)
	} else {
		// New user: revoke old Clerk invite and create new one
		api.revokeAndRecreateClerkInvite(ctx, invite, inviteAcceptanceURL, notificationParams)
	}

	return nil
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

	// Resend the invite via Clerk with fallback
	transactionErr := api.resendInviteWithNotification(c, invite, locale)
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Failed to resend invite", "error", transactionErr)
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

	// Track seat count change
	if api.UsageTracker != nil {
		api.UsageTracker.TrackSeats(invite.WorkspaceID)
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

	// Revoke the Clerk invite if it exists
	if invite.ClerkID != "" {
		clerk.SetKey(api.Env.ClerkSecretKey)
		if _, revokeErr := invitation.Revoke(c, invite.ClerkID); revokeErr != nil {
			api.Logger.WarnContext(c, "Failed to revoke Clerk invite on decline",
				"clerk_id", invite.ClerkID, "error", revokeErr)
		}
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

// notifyExistingUser sends Novu notifications (in-app + email) for an existing user invite.
// The Novu workflow handles both channels from a single trigger.
func (api *APIServices) notifyExistingUser(
	ctx context.Context,
	params lib.InviteNotificationParams,
) *lib.InviteNotificationResult {
	novuResult, err := lib.SendNovuInviteNotification(
		ctx, api.DB, api.SQIDManager, api.Env, api.Logger, params,
	)
	if err != nil {
		api.Logger.WarnContext(ctx, "Novu notification failed",
			"email", params.Invite.Email, "error", err)
	} else if novuResult != nil && novuResult.Success {
		api.Logger.InfoContext(ctx, "Novu notification sent",
			"email", params.Invite.Email, "notification_id", novuResult.NotificationID)
	}
	return novuResult
}

// createClerkInviteForNewUser creates a Clerk invitation for a new user who doesn't have an account yet.
// Returns the Clerk invite ID and whether the invitation was created successfully.
func (api *APIServices) createClerkInviteForNewUser(
	ctx context.Context,
	email string,
	redirectURL string,
) (string, bool) {
	clerk.SetKey(api.Env.ClerkSecretKey)
	expiresInDays := int64(api.Env.InviteExpiresInDays)
	clerkInvite, err := invitation.Create(ctx, &invitation.CreateParams{
		EmailAddress:  email,
		RedirectURL:   &redirectURL,
		ExpiresInDays: &expiresInDays,
	})
	if err != nil {
		api.Logger.WarnContext(ctx, "Clerk invitation creation failed",
			"error", err, "email", email)
		return "", false
	}
	api.Logger.InfoContext(ctx, "Clerk invitation created for new user",
		"email", email, "clerk_id", clerkInvite.ID)
	return clerkInvite.ID, true
}

// sendNewUserInvite attempts to create a Clerk invitation for a new user.
// If Clerk fails, sends an email via Novu as fallback by creating a temporary subscriber.
// Returns the notification result (if any) and whether a Clerk invite was created.
func (api *APIServices) sendNewUserInvite(
	ctx context.Context,
	invite *db.Invite,
	inviteAcceptanceURL string,
	params lib.InviteNotificationParams,
) (*lib.InviteNotificationResult, bool) {
	clerkID, created := api.createClerkInviteForNewUser(ctx, params.Invite.Email, inviteAcceptanceURL)
	if created {
		invite.ClerkID = clerkID
		if saveErr := api.DB.Save(invite).Error; saveErr != nil {
			api.Logger.ErrorContext(ctx, "Error updating invite with Clerk ID", "error", saveErr)
			return nil, false
		}
		return nil, true
	}

	// Clerk failed — send email via Novu (creates temporary subscriber)
	novuResult, novuErr := lib.SendNovuEmailOnlyNotification(ctx, api.Env, api.Logger, params)
	if novuErr != nil {
		api.Logger.WarnContext(ctx, "Novu email fallback failed",
			"email", params.Invite.Email, "error", novuErr)
	}
	return novuResult, false
}

// revokeAndRecreateClerkInvite revokes an existing Clerk invite and creates a new one for resend.
// Falls back to Novu email if Clerk creation fails.
func (api *APIServices) revokeAndRecreateClerkInvite(
	ctx context.Context,
	invite *db.Invite,
	inviteAcceptanceURL string,
	params lib.InviteNotificationParams,
) {
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Revoke the existing Clerk invite if present
	if invite.ClerkID != "" {
		if _, revokeErr := invitation.Revoke(ctx, invite.ClerkID); revokeErr != nil {
			api.Logger.WarnContext(ctx, "Error revoking existing invite in Clerk",
				"error", revokeErr, "clerk_id", invite.ClerkID)
			// Revocation failed — clear the ID anyway so we can attempt a new invite.
			// The old Clerk invite may have expired or been invalidated on their side.
		}
		invite.ClerkID = ""
	}

	clerkID, created := api.createClerkInviteForNewUser(ctx, invite.Email, inviteAcceptanceURL)
	if created {
		invite.ClerkID = clerkID
	}

	// Persist the updated ClerkID (cleared after revocation, or set to the new one)
	if saveErr := api.DB.Save(invite).Error; saveErr != nil {
		api.Logger.ErrorContext(ctx, "Error saving Clerk ID after resend",
			"error", saveErr, "email", invite.Email)
	}

	if created {
		return
	}

	// Clerk failed — send email via Novu (creates temporary subscriber)
	novuResult, novuErr := lib.SendNovuEmailOnlyNotification(ctx, api.Env, api.Logger, params)
	if novuErr != nil {
		api.Logger.WarnContext(ctx, "Novu email fallback failed on resend",
			"email", invite.Email, "error", novuErr)
	}
	if novuResult != nil {
		api.Logger.InfoContext(ctx, "Novu email fallback attempted",
			"email", invite.Email, "method", novuResult.Method, "success", novuResult.Success)
	}
}
