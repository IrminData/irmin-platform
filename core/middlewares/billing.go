package middlewares

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"irmin-api/db"
	"irmin-api/services"
	"irmin-api/utils"
	"strconv"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// webhookTimestampTolerance is the maximum age of a webhook timestamp before it is rejected.
// Per the Standard Webhooks specification, 5 minutes is the recommended tolerance.
const webhookTimestampTolerance = 5 * time.Minute

// BillingEnabledMiddleware returns 404 if billing is disabled.
// Applied to all billing routes to ensure they are only accessible when billing is enabled.
func (api *APIMiddlewares) BillingEnabledMiddleware(c fiber.Ctx) error {
	if !api.Env.BillingEnabled || api.Services.BillingService == nil {
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Message: "Billing is not enabled",
		})
	}
	return c.Next()
}

// BillingPermissionMiddleware creates a middleware for billing-level permissions.
func (api *APIMiddlewares) BillingPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceBilling,
		action,
		nil,
	)
}

// APIUsageMiddleware tracks API requests and response sizes for billing.
// Should be placed after WorkspaceMiddleware on the v1 group.
// Only tracks usage for external API consumers (cred_ tokens); console (Clerk JWT) users are not metered.
func (api *APIMiddlewares) APIUsageMiddleware(c fiber.Ctx) error {
	// Continue with the request first
	err := c.Next()

	// Skip usage tracking for console (Clerk JWT) users — they shouldn't be metered
	tokenType, _ := c.Locals("token_type").(services.TokenType)
	if tokenType != services.TokenTypeCred {
		return err
	}

	// Track usage only for successful requests and when billing is enabled
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if api.Services.UsageTracker != nil && c.Response().StatusCode() < 400 && workspaceOk {
		// Track API request
		api.Services.UsageTracker.Track(workspace.ID, db.UsageDimensionAPIRequests, 1)

		// Track data transfer (response body size in bytes)
		if responseSize := int64(len(c.Response().Body())); responseSize > 0 {
			api.Services.UsageTracker.Track(workspace.ID, db.UsageDimensionDataTransfer, responseSize)
		}

		// Track data transfer (request body size for ingress)
		if requestSize := int64(len(c.Body())); requestSize > 0 {
			api.Services.UsageTracker.Track(workspace.ID, db.UsageDimensionDataTransfer, requestSize)
		}
	}

	return err
}

// UsageLimitMiddleware checks if the workspace has exceeded its usage limit for the given dimension.
// Returns 429 if the limit is exceeded. Only enforces hard limits for users without a payment method.
func (api *APIMiddlewares) UsageLimitMiddleware(dimension db.UsageDimension) fiber.Handler {
	return func(c fiber.Ctx) error {
		if api.Services.BillingService == nil {
			return c.Next()
		}

		workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
		if !workspaceOk {
			return c.Next()
		}

		allowed, err := api.Services.BillingService.CheckUsageLimit(workspace.ID, dimension, 1)
		if err != nil {
			// Fail open — log and continue
			api.Logger.Error("Failed to check usage limit", "error", err, "workspace_id", workspace.ID)
			return c.Next()
		}

		if !allowed {
			return utils.WriteResponse(c, fiber.StatusTooManyRequests, irminmodels.IrminAPIResponse{
				Message: "Usage limit exceeded. Add a payment method to unlock unlimited usage.",
				Errors:  []string{"usage_limit_exceeded"},
			})
		}

		return c.Next()
	}
}

// PolarWebhookMiddleware verifies the Polar webhook signature and checks idempotency.
func (api *APIMiddlewares) PolarWebhookMiddleware(c fiber.Ctx) error {
	if !api.Env.BillingEnabled || api.Services.BillingService == nil {
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Message: "Billing is not enabled",
		})
	}

	// Verify Standard Webhooks signature (webhook-id, webhook-timestamp, webhook-signature)
	webhookID := c.Get("webhook-id")
	webhookTimestamp := c.Get("webhook-timestamp")
	webhookSignature := c.Get("webhook-signature")

	if webhookID == "" || webhookTimestamp == "" || webhookSignature == "" {
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Message: "Missing webhook signature headers",
		})
	}

	body := c.Body()
	if reason := verifyPolarSignature(body, webhookID, webhookTimestamp, webhookSignature, api.Env.PolarWebhookSecret); reason != "" {
		api.Logger.Warn("Invalid Polar webhook signature",
			"reason", reason,
			"webhook_id", webhookID,
			"webhook_timestamp", webhookTimestamp,
			"webhook_signature", webhookSignature,
			"body_len", len(body),
		)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Message: "Invalid webhook signature",
		})
	}

	// Reject events with timestamps that are too old, negative, or too far in the future
	ts, parseErr := strconv.ParseInt(webhookTimestamp, 10, 64)
	if parseErr != nil || ts <= 0 {
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Message: "Invalid webhook timestamp",
		})
	}
	webhookTime := time.Unix(ts, 0)
	now := time.Now()
	if now.Sub(webhookTime) > webhookTimestampTolerance || webhookTime.After(now.Add(webhookTimestampTolerance)) {
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Message: "Webhook timestamp out of range",
		})
	}

	// Parse payload to check idempotency
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Message: "Invalid webhook payload",
		})
	}

	// Check idempotency — reject if this webhook-id was already successfully processed.
	// This is a fast-path check; the unique constraint on billing_events.polar_event_id
	// provides the true atomic guard against concurrent duplicate delivery.
	if webhookID != "" {
		if _, lookupErr := api.DB.GetBillingEventByPolarID(webhookID); lookupErr == nil {
			return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
				Message: "Event already processed",
			})
		}
	}

	// Store payload, raw body, and event ID in locals for the handler
	c.Locals("polar_payload", payload)
	c.Locals("polar_raw_body", body)
	c.Locals("polar_event_id", webhookID)

	return c.Next()
}

// verifyPolarSignature verifies a Standard Webhooks signature.
// The signed content is "{webhook-id}.{webhook-timestamp}.{body}".
// The secret is base64-encoded and the signature header may contain multiple
// space-separated signatures prefixed with "v1,".
// verifyPolarSignature returns an empty string on success, or a diagnostic reason on failure.
func verifyPolarSignature(body []byte, webhookID, timestamp, signatureHeader, secret string) string {
	if secret == "" {
		return "empty secret"
	}

	// Polar's SDK passes the secret through: Buffer.from(secret, "utf-8").toString("base64"),
	// then the Standard Webhooks library base64-decodes it — net effect: HMAC key = raw UTF-8
	// bytes of the full secret string (including the polar_whs_ prefix).
	// For whsec_ secrets (Standard Webhooks reference), strip the prefix and base64-decode.
	var secretBytes []byte
	if strings.HasPrefix(secret, "whsec_") {
		raw := strings.TrimPrefix(secret, "whsec_")
		var err error
		secretBytes, err = decodeBase64Flexible(raw)
		if err != nil {
			return fmt.Sprintf("whsec_ secret decode failed: %v", err)
		}
	} else {
		// Polar-style secret: use the entire string as raw UTF-8 bytes
		secretBytes = []byte(secret)
	}

	// Build signed content: "{id}.{timestamp}.{body}"
	signedContent := fmt.Sprintf("%s.%s.%s", webhookID, timestamp, string(body))

	mac := hmac.New(sha256.New, secretBytes)
	mac.Write([]byte(signedContent))
	expectedMAC := mac.Sum(nil)
	expectedB64 := base64.StdEncoding.EncodeToString(expectedMAC)

	// The header may contain multiple signatures separated by spaces, each prefixed with "v1,"
	const sigPartCount = 2
	var lastMismatch string
	for _, sig := range strings.Split(signatureHeader, " ") {
		parts := strings.SplitN(sig, ",", sigPartCount)
		if len(parts) == sigPartCount && parts[0] == "v1" {
			receivedMAC, decErr := decodeBase64Flexible(parts[1])
			if decErr != nil {
				continue
			}
			if hmac.Equal(receivedMAC, expectedMAC) {
				return "" // success
			}
			lastMismatch = fmt.Sprintf("hmac mismatch: got=%s want=%s secret_bytes=%d body_len=%d",
				parts[1], expectedB64, len(secretBytes), len(body))
		}
	}

	if lastMismatch != "" {
		return lastMismatch
	}
	return fmt.Sprintf("no valid v1 signature found in header: %q", signatureHeader)
}

// decodeBase64Flexible decodes a base64 string trying standard padded encoding first,
// then falling back to unpadded variants. Polar's polar_whs_ secrets are unpadded and may
// use either standard (+/) or URL-safe (-_) alphabet, so we try both raw encodings.
func decodeBase64Flexible(s string) ([]byte, error) {
	if b, err := base64.StdEncoding.DecodeString(s); err == nil {
		return b, nil
	}
	if b, err := base64.RawStdEncoding.DecodeString(s); err == nil {
		return b, nil
	}
	return base64.RawURLEncoding.DecodeString(s)
}
