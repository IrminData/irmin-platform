package lib

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"
	"strings"

	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"
	novugo "github.com/novuhq/novu-go"
	"github.com/novuhq/novu-go/models/components"
)

// InviteNotificationResult represents the result of sending an invitation notification.
type InviteNotificationResult struct {
	Success        bool   `json:"success"`
	Method         string `json:"method"` // "clerk", "novu", "none"
	Message        string `json:"message"`
	NotificationID string `json:"notification_id,omitempty"`
	Error          string `json:"error,omitempty"`
}

// InviteNotificationParams contains all parameters needed to send invitation notifications.
type InviteNotificationParams struct {
	Invite              *db.Invite
	Workspace           *db.Workspace
	InvitedBy           *db.User
	Role                *db.Role
	InviteAcceptanceURL string
	Locale              string
}

// SendNovuInviteNotification sends an invitation notification via Novu (in-app + email).
// The Novu workflow handles both channels from a single trigger.
func SendNovuInviteNotification(
	ctx context.Context,
	database *db.Database,
	sqidManager *irminsqids.SQIDManager,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
	params InviteNotificationParams,
) (*InviteNotificationResult, error) {
	if env.NovuSecretKey == "" {
		logger.WarnContext(ctx, "Novu secret key not configured")
		return &InviteNotificationResult{
			Success: false,
			Method:  "novu",
			Message: "Novu service not configured",
			Error:   "missing Novu secret key",
		}, errors.New("novu secret key not configured")
	}

	// Check if user exists in our database (for Novu subscriber ID)
	existingUser, err := database.GetUserByEmail(params.Invite.Email)
	if err != nil {
		logger.WarnContext(ctx, "Failed to retrieve user for Novu notification",
			"email", params.Invite.Email, "error", err)
		return &InviteNotificationResult{
			Success: false,
			Method:  "novu",
			Message: "User not found in system for Novu notification",
			Error:   err.Error(),
		}, nil
	}

	if existingUser == nil {
		logger.WarnContext(ctx, "User not found for Novu notification", "email", params.Invite.Email)
		return &InviteNotificationResult{
			Success: false,
			Method:  "novu",
			Message: "User not found in system for Novu notification",
		}, nil
	}

	// Ensure user has a Novu subscriber ID, creating one on demand if needed
	if existingUser.NovuSubscriberID == "" {
		subscriber, ensureErr := EnsureNovuSubscriber(ctx, sqidManager, env, params.Locale, existingUser)
		if ensureErr != nil || subscriber == nil || subscriber.SubscriberID == "" {
			logger.WarnContext(ctx, "Failed to ensure Novu subscriber for user",
				"email", params.Invite.Email, "user_id", existingUser.ID, "error", ensureErr)
			return &InviteNotificationResult{
				Success: false,
				Method:  "novu",
				Message: "Could not create notification subscriber",
				Error:   "failed to ensure Novu subscriber",
			}, nil
		}
		existingUser.NovuSubscriberID = subscriber.SubscriberID
		if saveErr := database.Save(existingUser).Error; saveErr != nil {
			logger.WarnContext(ctx, "Failed to save Novu subscriber ID",
				"email", params.Invite.Email, "error", saveErr)
		}
	}

	return triggerNovuInviteWorkflow(ctx, env, logger, existingUser.NovuSubscriberID, params)
}

// SendNovuEmailOnlyNotification sends an invite notification via Novu for a user who doesn't
// have an Irmin account yet. Creates a temporary Novu subscriber with just their email so the
// email step of the workflow delivers the invite. The in-app step will have no effect since
// the user has no frontend session.
func SendNovuEmailOnlyNotification(
	ctx context.Context,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
	params InviteNotificationParams,
) (*InviteNotificationResult, error) {
	if env.NovuSecretKey == "" {
		logger.WarnContext(ctx, "Novu secret key not configured")
		return &InviteNotificationResult{
			Success: false,
			Method:  "novu",
			Message: "Novu service not configured",
			Error:   "missing Novu secret key",
		}, errors.New("novu secret key not configured")
	}

	// Create a temporary Novu subscriber with just the email address.
	// Use the email as the subscriber ID for simplicity (will be replaced when they create an account).
	s := novugo.New(novugo.WithSecurity(env.NovuSecretKey))

	email := params.Invite.Email
	subscriberID := "invite-" + email // Prefix to avoid collision with SQID-based subscriber IDs

	_, createErr := s.Subscribers.Create(ctx, components.CreateSubscriberRequestDto{
		SubscriberID: subscriberID,
		Email:        &email,
	}, nil, nil)
	if createErr != nil {
		// Subscriber might already exist from a previous invite — that's fine, try to trigger anyway
		logger.InfoContext(ctx, "Novu subscriber creation returned error (may already exist)",
			"email", email, "error", createErr)
	}

	return triggerNovuInviteWorkflow(ctx, env, logger, subscriberID, params)
}

// triggerNovuInviteWorkflow triggers the workspace-invite Novu workflow for a given subscriber.
func triggerNovuInviteWorkflow(
	ctx context.Context,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
	subscriberID string,
	params InviteNotificationParams,
) (*InviteNotificationResult, error) {
	s := novugo.New(novugo.WithSecurity(env.NovuSecretKey))
	workflowID := NovuInviteWorkflowID

	inviterName := strings.TrimSpace(
		fmt.Sprintf("%s %s", params.InvitedBy.FirstName, params.InvitedBy.LastName),
	)
	payload := map[string]any{
		"workspaceName": params.Workspace.Name,
		"inviterName":   inviterName,
		"inviterEmail":  params.InvitedBy.Email,
		"roleName":      params.Role.Role,
		"inviteUrl":     params.InviteAcceptanceURL,
		"expiresAt":     params.Invite.ExpiresAt.Format("January 2, 2006"),
	}

	var actor *components.Actor
	if params.InvitedBy.NovuSubscriberID != "" {
		a := components.CreateActorStr(params.InvitedBy.NovuSubscriberID)
		actor = &a
	}

	logger.InfoContext(ctx, "Triggering Novu workflow",
		"workflow_id", workflowID,
		"subscriber_id", subscriberID,
		"email", params.Invite.Email,
	)

	triggerResp, triggerErr := s.Trigger(ctx, components.TriggerEventRequestDto{
		WorkflowID: workflowID,
		To:         components.CreateToStr(subscriberID),
		Payload:    payload,
		Actor:      actor,
	}, nil)

	if triggerErr != nil {
		logger.ErrorContext(ctx, "Failed to trigger Novu workflow",
			"email", params.Invite.Email,
			"workflow_id", workflowID,
			"subscriber_id", subscriberID,
			"error", triggerErr)
		return &InviteNotificationResult{
			Success: false,
			Method:  "novu",
			Message: "Failed to trigger notification workflow",
			Error:   triggerErr.Error(),
		}, triggerErr
	}

	var notificationID string
	var acknowledged bool
	var status string
	var respErrors []string
	if triggerResp != nil && triggerResp.TriggerEventResponseDto != nil {
		dto := triggerResp.TriggerEventResponseDto
		if dto.TransactionID != nil {
			notificationID = *dto.TransactionID
		}
		acknowledged = dto.Acknowledged
		status = string(dto.Status)
		respErrors = dto.Error
	}

	logger.InfoContext(ctx, "Novu trigger response",
		"email", params.Invite.Email,
		"notification_id", notificationID,
		"acknowledged", acknowledged,
		"status", status,
		"errors", respErrors,
		"subscriber_id", subscriberID,
		"workflow_id", workflowID,
		"workspace", params.Workspace.Name)

	if !acknowledged || (status != "" && status != "processed") {
		errMsg := fmt.Sprintf("trigger not processed: acknowledged=%t, status=%s", acknowledged, status)
		if len(respErrors) > 0 {
			errMsg = fmt.Sprintf("%s, errors=%v", errMsg, respErrors)
		}
		return &InviteNotificationResult{
			Success: false,
			Method:  "novu",
			Message: "Notification trigger was not processed by Novu",
			Error:   errMsg,
		}, nil
	}

	return &InviteNotificationResult{
		Success:        true,
		Method:         "novu",
		Message:        "Notification sent via Novu",
		NotificationID: notificationID,
	}, nil
}
