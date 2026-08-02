package lib

import (
	"context"
	"fmt"
	"irmin-api/utils"
	"log/slog"
	"time"

	novugo "github.com/novuhq/novu-go"
	"github.com/novuhq/novu-go/models/components"
)

// NovuWorkflowDefinition defines a Novu workflow to be ensured at startup.
type NovuWorkflowDefinition struct {
	WorkflowID  string
	Name        string
	Description string
	Tags        []string
	Steps       []components.Steps
	// UpdateSteps are used when updating an existing workflow (different type from create steps).
	UpdateSteps []components.UpdateWorkflowDtoSteps
}

// novuWorkflowEnsureTimeout is the timeout for individual workflow ensure operations.
const novuWorkflowEnsureTimeout = 15 * time.Second

// NovuInviteWorkflowID is the workflow identifier for workspace invitation notifications.
const NovuInviteWorkflowID = "workspace-invite"

// novuInviteEmailBody is the HTML email template for workspace invitations.
// Uses Novu Liquid template syntax: {{payload.variableName}}
const novuInviteEmailBody = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
    <style>
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            line-height: 1.2;
        }
        .header .workspace-name {
            font-size: 20px;
            font-weight: 400;
            margin-top: 8px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #2d3748;
            margin-bottom: 20px;
        }
        .invitation-details {
            background-color: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .invitation-details p {
            margin: 0 0 10px 0;
        }
        .invitation-details .label {
            font-weight: 600;
            color: #4a5568;
        }
        .invitation-details .value {
            color: #2d3748;
        }
        .cta-container {
            text-align: center;
            margin: 40px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
        }
        .alternative-link {
            margin-top: 20px;
            padding: 15px;
            background-color: #f7fafc;
            border-radius: 4px;
            font-size: 14px;
            color: #718096;
            word-break: break-all;
        }
        .alternative-link a {
            color: #667eea;
            text-decoration: none;
        }
        .expiration-notice {
            background-color: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .expiration-notice .text {
            color: #744210;
            font-weight: 500;
        }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
        }
        .footer p {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #718096;
        }
        .footer .brand {
            font-weight: 600;
            color: #667eea;
        }
        @media only screen and (max-width: 600px) {
            .email-container { margin: 0; border-radius: 0; }
            .header, .content, .footer { padding: 20px; }
            .header h1 { font-size: 24px; }
            .header .workspace-name { font-size: 18px; }
            .cta-button { padding: 14px 24px; font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>You're Invited!</h1>
            <div class="workspace-name">{{payload.workspaceName}}</div>
        </div>
        <div class="content">
            <div class="greeting">Hi there!</div>
            <p><strong>{{payload.inviterName}}</strong> has invited you to join the <strong>{{payload.workspaceName}}</strong> workspace on the Irmin platform.</p>
            <div class="invitation-details">
                <p><span class="label">Invited by:</span> <span class="value">{{payload.inviterName}} ({{payload.inviterEmail}})</span></p>
                <p><span class="label">Workspace:</span> <span class="value">{{payload.workspaceName}}</span></p>
                <p><span class="label">Your role:</span> <span class="value">{{payload.roleName}}</span></p>
            </div>
            <p>To accept this invitation and start collaborating, click the button below:</p>
            <div class="cta-container">
                <a href="{{payload.inviteUrl}}" class="cta-button">Accept Invitation</a>
            </div>
            <div class="alternative-link">
                <strong>Button not working?</strong> Copy and paste this URL into your browser:
                <br><a href="{{payload.inviteUrl}}">{{payload.inviteUrl}}</a>
            </div>
            <div class="expiration-notice">
                <span class="text">This invitation expires on {{payload.expiresAt}}</span>
            </div>
            <p>Once you accept, you'll have access to all the data, workflows, and collaboration tools within the {{payload.workspaceName}} workspace.</p>
        </div>
        <div class="footer">
            <p>If you don't want to join this workspace, you can safely ignore this email.</p>
            <p>This is an automated email from the <span class="brand">Irmin</span> platform.</p>
        </div>
    </div>
</body>
</html>`

// GetNovuWorkflowDefinitions returns all Novu workflow definitions that should exist.
// Add new workflows here as the notification system grows.
func GetNovuWorkflowDefinitions() []NovuWorkflowDefinition {
	// In-app step
	inAppSubject := "You've been invited to {{payload.workspaceName}}"
	inAppBody := "{{payload.inviterName}} invited you to join {{payload.workspaceName}} as {{payload.roleName}}"

	inAppControlValues := components.CreateInAppStepUpsertDtoControlValuesInAppControlDto(
		components.InAppControlDto{
			Subject: &inAppSubject,
			Body:    &inAppBody,
			PrimaryAction: &components.ActionDto{
				Label: utils.StringPtr("View Invite"),
				Redirect: &components.RedirectDto{
					URL:    utils.StringPtr("{{payload.inviteUrl}}"),
					Target: components.TargetSelf.ToPointer(),
				},
			},
			SecondaryAction: &components.ActionDto{
				Label: utils.StringPtr("Dismiss"),
			},
			Redirect: &components.RedirectDto{
				URL:    utils.StringPtr("{{payload.inviteUrl}}"),
				Target: components.TargetSelf.ToPointer(),
			},
			Data: map[string]any{
				"inviteUrl": "{{payload.inviteUrl}}",
			},
		},
	)

	inAppStep := components.CreateStepsInApp(components.InAppStepUpsertDto{
		Name:          "Send in-app invite notification",
		ControlValues: &inAppControlValues,
	})

	// Email step
	emailSubject := "You've been invited to join {{payload.workspaceName}}"
	emailBody := novuInviteEmailBody
	editorType := components.EmailControlDtoEditorTypeHTML

	emailControlValues := components.CreateEmailStepUpsertDtoControlValuesEmailControlDto(
		components.EmailControlDto{
			Subject:    emailSubject,
			Body:       &emailBody,
			EditorType: &editorType,
		},
	)

	emailStep := components.CreateStepsEmail(components.EmailStepUpsertDto{
		Name:          "Send invite email",
		ControlValues: &emailControlValues,
	})

	// Build update steps (same definitions, different union type for Update API)
	inAppUpdateStep := components.CreateUpdateWorkflowDtoStepsInApp(components.InAppStepUpsertDto{
		Name:          "Send in-app invite notification",
		ControlValues: &inAppControlValues,
	})
	emailUpdateStep := components.CreateUpdateWorkflowDtoStepsEmail(components.EmailStepUpsertDto{
		Name:          "Send invite email",
		ControlValues: &emailControlValues,
	})

	return []NovuWorkflowDefinition{
		{
			WorkflowID:  NovuInviteWorkflowID,
			Name:        "Workspace Invite",
			Description: "Sends in-app and email notifications when a user is invited to a workspace.",
			Tags:        []string{"invites", "workspace"},
			Steps:       []components.Steps{inAppStep, emailStep},
			UpdateSteps: []components.UpdateWorkflowDtoSteps{inAppUpdateStep, emailUpdateStep},
		},
	}
}

// EnsureNovuWorkflows checks that all required Novu workflows exist and creates any that are missing.
// It also updates existing workflows if their step count doesn't match the expected definition.
// This should be called once at server startup. It logs warnings on failure but does not return errors,
// since a missing workflow should not prevent the server from starting.
func EnsureNovuWorkflows(env *utils.CoreAPIEnv, logger *slog.Logger) {
	ctx := context.Background()

	if env.NovuSecretKey == "" {
		logger.WarnContext(ctx, "Novu secret key not configured, skipping workflow verification")
		return
	}

	client := novugo.New(novugo.WithSecurity(env.NovuSecretKey))
	definitions := GetNovuWorkflowDefinitions()

	for _, def := range definitions {
		ensureCtx, cancel := context.WithTimeout(ctx, novuWorkflowEnsureTimeout)
		if err := ensureSingleWorkflow(ensureCtx, client, def, logger); err != nil {
			logger.WarnContext(ensureCtx, "Failed to ensure Novu workflow",
				"workflow_id", def.WorkflowID, "error", err)
		}
		cancel()
	}
}

// ensureSingleWorkflow checks if a workflow exists, creates it if missing, or updates it if steps changed.
func ensureSingleWorkflow(
	ctx context.Context,
	client *novugo.Novu,
	def NovuWorkflowDefinition,
	logger *slog.Logger,
) error {
	// Check if the workflow already exists
	resp, err := client.Workflows.Get(ctx, def.WorkflowID, nil, nil)
	if err == nil && resp != nil && resp.WorkflowResponseDto != nil {
		existing := resp.WorkflowResponseDto
		// Check if the workflow needs updating (step count mismatch)
		if len(existing.Steps) != len(def.Steps) {
			logger.InfoContext(ctx, "Novu workflow needs updating",
				"workflow_id", def.WorkflowID,
				"existing_steps", len(existing.Steps),
				"expected_steps", len(def.Steps))
			return updateWorkflow(ctx, client, def, logger)
		}
		logger.InfoContext(ctx, "Novu workflow verified",
			"workflow_id", def.WorkflowID,
			"status", existing.Status,
			"steps", len(existing.Steps))
		return nil
	}

	// Workflow not found — create it
	return createWorkflow(ctx, client, def, logger)
}

// createWorkflow creates a new Novu workflow.
func createWorkflow(
	ctx context.Context,
	client *novugo.Novu,
	def NovuWorkflowDefinition,
	logger *slog.Logger,
) error {
	logger.InfoContext(ctx, "Creating Novu workflow", "workflow_id", def.WorkflowID)

	active := true
	idempotencyKey := "ensure-" + def.WorkflowID
	createResp, createErr := client.Workflows.Create(ctx, components.CreateWorkflowDto{
		Name:        def.Name,
		WorkflowID:  def.WorkflowID,
		Description: &def.Description,
		Active:      &active,
		Steps:       def.Steps,
		Tags:        def.Tags,
	}, &idempotencyKey)

	if createErr != nil {
		// Check if a concurrent startup created it
		retryResp, retryErr := client.Workflows.Get(ctx, def.WorkflowID, nil, nil)
		if retryErr == nil && retryResp != nil && retryResp.WorkflowResponseDto != nil {
			logger.InfoContext(ctx, "Novu workflow was created concurrently", "workflow_id", def.WorkflowID)
			return nil
		}
		return fmt.Errorf("failed to create workflow %s: %w", def.WorkflowID, createErr)
	}

	if createResp != nil && createResp.WorkflowResponseDto != nil {
		logger.InfoContext(ctx, "Novu workflow created",
			"workflow_id", createResp.WorkflowResponseDto.WorkflowID,
			"status", createResp.WorkflowResponseDto.Status)
	}

	return nil
}

// updateWorkflow updates an existing Novu workflow with the expected step definitions.
func updateWorkflow(
	ctx context.Context,
	client *novugo.Novu,
	def NovuWorkflowDefinition,
	logger *slog.Logger,
) error {
	logger.InfoContext(ctx, "Updating Novu workflow", "workflow_id", def.WorkflowID)

	active := true
	updateResp, updateErr := client.Workflows.Update(ctx, def.WorkflowID, components.UpdateWorkflowDto{
		Name:        def.Name,
		Description: &def.Description,
		Active:      &active,
		Steps:       def.UpdateSteps,
		Tags:        def.Tags,
		Origin:      components.ResourceOriginEnumNovuCloud,
		Preferences: components.PreferencesRequestDto{},
	}, nil)

	if updateErr != nil {
		return fmt.Errorf("failed to update workflow %s: %w", def.WorkflowID, updateErr)
	}

	if updateResp != nil && updateResp.WorkflowResponseDto != nil {
		logger.InfoContext(ctx, "Novu workflow updated",
			"workflow_id", updateResp.WorkflowResponseDto.WorkflowID,
			"status", updateResp.WorkflowResponseDto.Status,
			"steps", len(updateResp.WorkflowResponseDto.Steps))
	}

	return nil
}
