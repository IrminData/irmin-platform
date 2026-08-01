package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"
	"net/http"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

const (
	polarRequestTimeout = 15 * time.Second
)

// BillingService handles billing operations with Polar.sh.
type BillingService struct {
	db      *db.Database
	env     *utils.CoreAPIEnv
	logger  *slog.Logger
	client  *http.Client
	baseURL string
}

// NewBillingService creates a new billing service. Returns nil if billing is disabled.
func NewBillingService(database *db.Database, env *utils.CoreAPIEnv, logger *slog.Logger) *BillingService {
	if !env.BillingEnabled {
		return nil
	}
	return &BillingService{
		db:      database,
		env:     env,
		logger:  logger,
		client:  &http.Client{Timeout: polarRequestTimeout},
		baseURL: env.PolarBaseURL,
	}
}

// IsEnabled returns true if billing is enabled.
func (s *BillingService) IsEnabled() bool {
	return s != nil
}

// CreateOrGetCustomer creates or retrieves a Polar customer for the workspace.
func (s *BillingService) CreateOrGetCustomer(workspaceSQID, ownerEmail, name string) (string, error) {
	body := map[string]any{
		"email":       ownerEmail,
		"external_id": workspaceSQID,
		"name":        name,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("failed to marshal customer request: %w", err)
	}

	resp, err := s.polarPost(context.Background(), "/v1/customers", jsonBody)
	if err != nil {
		return "", fmt.Errorf("failed to create customer: %w", err)
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return "", fmt.Errorf("failed to read customer response: %w", readErr)
	}

	var result map[string]any
	if decodeErr := json.Unmarshal(respBody, &result); decodeErr != nil {
		return "", fmt.Errorf("failed to decode customer response: %w", decodeErr)
	}

	customerID, ok := result["id"].(string)
	if !ok {
		return "", fmt.Errorf("unexpected customer response format (status %d): %s", resp.StatusCode, string(respBody))
	}

	return customerID, nil
}

// CreateCheckoutSession creates a Polar checkout session and returns the checkout URL.
func (s *BillingService) CreateCheckoutSession(
	polarCustomerID, productID, returnURL string,
) (string, error) {
	body := map[string]any{
		"product_id":        productID,
		"customer_id":       polarCustomerID,
		"success_url":       returnURL,
		"payment_processor": "stripe",
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("failed to marshal checkout request: %w", err)
	}

	resp, err := s.polarPost(context.Background(), "/v1/checkouts/", jsonBody)
	if err != nil {
		return "", fmt.Errorf("failed to create checkout: %w", err)
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return "", fmt.Errorf("failed to read checkout response: %w", readErr)
	}

	var result map[string]any
	if decodeErr := json.Unmarshal(respBody, &result); decodeErr != nil {
		return "", fmt.Errorf("failed to decode checkout response: %w", decodeErr)
	}

	checkoutURL, ok := result["url"].(string)
	if !ok {
		return "", fmt.Errorf("unexpected checkout response format (status %d): %s", resp.StatusCode, string(respBody))
	}

	return checkoutURL, nil
}

// GetCustomerPortalURL creates a customer portal session and returns the URL.
func (s *BillingService) GetCustomerPortalURL(polarCustomerID string) (string, error) {
	body := map[string]any{
		"customer_id": polarCustomerID,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("failed to marshal portal request: %w", err)
	}

	resp, err := s.polarPost(context.Background(), "/v1/customer-sessions/", jsonBody)
	if err != nil {
		return "", fmt.Errorf("failed to create portal session: %w", err)
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return "", fmt.Errorf("failed to read portal response: %w", readErr)
	}

	var result map[string]any
	if decodeErr := json.Unmarshal(respBody, &result); decodeErr != nil {
		return "", fmt.Errorf("failed to decode portal response: %w", decodeErr)
	}

	portalURL, ok := result["customer_portal_url"].(string)
	if !ok {
		return "", fmt.Errorf("unexpected portal response format (status %d): %s", resp.StatusCode, string(respBody))
	}

	return portalURL, nil
}

// ReportUsageBatch reports usage events to Polar's metering API.
// Returns an error if any events failed ingestion so callers can avoid marking them as reported.
func (s *BillingService) ReportUsageBatch(events []map[string]any) error {
	if len(events) == 0 {
		return nil
	}

	body := map[string]any{
		"events": events,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal usage events: %w", err)
	}

	resp, err := s.polarPost(context.Background(), "/v1/events/ingest", jsonBody)
	if err != nil {
		return fmt.Errorf("failed to report usage: %w", err)
	}
	defer resp.Body.Close()

	// Check response body for partial failures
	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return fmt.Errorf("failed to read usage ingest response: %w", readErr)
	}

	var result map[string]any
	if decodeErr := json.Unmarshal(respBody, &result); decodeErr != nil {
		// Non-JSON response but 2xx status — treat as success
		return nil
	}

	// Check for partial failure indicators in the response
	if failures, hasFailures := result["failed"].(float64); hasFailures && failures > 0 {
		return fmt.Errorf("polar usage ingest partial failure: %.0f events failed", failures)
	}

	return nil
}

// GetProductID returns the single Polar product ID for usage-based billing.
func (s *BillingService) GetProductID() string {
	return s.env.PolarProductID
}

// GetCurrentPlan retrieves the current plan info from the local database.
// If the local subscription has status "none" but has a PolarCustomerID, it falls back
// to the Polar API to check for an active subscription (handles missed webhooks).
// Returns defaults when no subscription exists.
//
//nolint:nilerr // Missing subscription is expected for new workspaces — not an error.
func (s *BillingService) GetCurrentPlan(workspaceID uint) (*irminmodels.PlanInfo, error) {
	sub, err := s.db.GetWorkspaceSubscription(workspaceID)
	if err != nil {
		return &irminmodels.PlanInfo{
			Status:           db.SubscriptionStatusNone,
			HasPaymentMethod: false,
			CreditPerMeter:   db.CreditPerMeter,
			TotalCredit:      db.TotalFreeCredit,
		}, nil
	}

	// If we have a customer ID but no active subscription locally, check Polar directly.
	// This handles cases where webhooks failed (e.g. signature verification bugs).
	if sub.PolarCustomerID != "" && sub.Status == db.SubscriptionStatusNone {
		if syncErr := s.syncSubscriptionFromPolar(sub); syncErr != nil {
			s.logger.Warn("Failed to sync subscription from Polar", "error", syncErr, "workspace_id", workspaceID)
		} else {
			// Re-read the subscription after sync
			if updated, readErr := s.db.GetWorkspaceSubscription(workspaceID); readErr == nil {
				sub = updated
			}
		}
	}

	hasPaymentMethod := sub.Status == db.SubscriptionStatusActive ||
		sub.Status == db.SubscriptionStatusTrialing ||
		sub.Status == db.SubscriptionStatusPastDue

	return &irminmodels.PlanInfo{
		Status:           sub.Status,
		HasPaymentMethod: hasPaymentMethod,
		PeriodStart:      sub.CurrentPeriodStart,
		PeriodEnd:        sub.CurrentPeriodEnd,
		CancelledAt:      sub.CancelledAt,
		CreditPerMeter:   db.CreditPerMeter,
		TotalCredit:      db.TotalFreeCredit,
	}, nil
}

// CheckUsageLimit checks if the workspace has exceeded its usage limit for a dimension.
// Returns true if the usage is within limits (request allowed).
// Users with a payment method have no limits. Users without one are subject to free tier hard limits.
func (s *BillingService) CheckUsageLimit(
	workspaceID uint,
	dimension db.UsageDimension,
	additionalQty int64,
) (bool, error) {
	plan, err := s.GetCurrentPlan(workspaceID)
	if err != nil {
		// Fail open — allow on error
		s.logger.Error("Failed to get plan for usage limit check", "error", err, "workspace_id", workspaceID)
		return true, nil
	}

	// Subscribers have no limits
	if plan.HasPaymentMethod {
		return true, nil
	}

	summaries, err := s.db.GetCurrentPeriodUsage(workspaceID)
	if err != nil {
		// Fail open
		s.logger.Error("Failed to get current period usage", "error", err, "workspace_id", workspaceID)
		return true, nil
	}

	freeLimits := db.GetFreeTierHardLimits()
	limit, hasLimit := freeLimits[dimension]
	if !hasLimit {
		return true, nil
	}

	for _, summary := range summaries {
		if summary.Dimension != dimension {
			continue
		}
		return summary.TotalQuantity+additionalQty <= limit, nil
	}

	// No summary exists — check against free limit with zero existing usage
	return additionalQty <= limit, nil
}

// CheckSeatLimit checks if the workspace can add another member.
// Free users get 1 member (the owner). Subscribers have unlimited seats.
func (s *BillingService) CheckSeatLimit(workspaceID uint) (bool, error) {
	plan, err := s.GetCurrentPlan(workspaceID)
	if err != nil {
		s.logger.Error("Failed to get plan for seat limit check", "error", err, "workspace_id", workspaceID)
		return true, nil // fail open
	}

	// Subscribers have unlimited seats
	if plan.HasPaymentMethod {
		return true, nil
	}

	// Free users: 1 member (the owner) + FreeExtraSeats additional members allowed.
	count, err := s.db.CountWorkspaceMembersAndInvites(workspaceID)
	if err != nil {
		s.logger.Error("Failed to count workspace members", "error", err, "workspace_id", workspaceID)
		return true, nil // fail open
	}

	maxMembers := int64(1 + db.FreeExtraSeats)
	return count < maxMembers, nil
}

// HandleWebhookEvent processes a Polar webhook event.
func (s *BillingService) HandleWebhookEvent(eventType string, payload map[string]any) error {
	switch eventType {
	case "subscription.created", "subscription.updated":
		return s.handleSubscriptionEvent(payload)
	case "subscription.canceled":
		return s.handleSubscriptionCancelled(payload)
	case "order.paid":
		s.logger.Info("Order paid webhook received", "payload_keys", getMapKeys(payload))
		return nil
	default:
		s.logger.Info("Unhandled webhook event type", "event_type", eventType)
		return nil
	}
}

// handleSubscriptionEvent processes subscription created/updated events.
func (s *BillingService) handleSubscriptionEvent(payload map[string]any) error {
	data, ok := payload["data"].(map[string]any)
	if !ok {
		return errors.New("invalid subscription webhook payload")
	}

	customerID, hasCustomer := extractNestedString(data, "customer_id")
	subscriptionID, hasSub := extractNestedString(data, "id")
	productID, hasProduct := extractNestedString(data, "product_id")
	status, _ := extractNestedString(data, "status")

	if !hasCustomer || !hasSub || !hasProduct {
		return errors.New("subscription webhook missing required fields: customer_id, id, or product_id")
	}

	// Find workspace by Polar customer ID to get the workspace ID
	existing, err := s.findSubscriptionByCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("failed to find subscription for customer %s: %w", customerID, err)
	}

	mappedStatus := mapPolarStatus(status)

	// Build a minimal struct with only the fields we want to update
	update := &db.WorkspaceSubscription{
		WorkspaceID:         existing.WorkspaceID,
		PolarSubscriptionID: subscriptionID,
		PolarProductID:      productID,
		Status:              mappedStatus,
	}

	// Clear cancellation date when the subscription is active again
	if mappedStatus == db.SubscriptionStatusActive || mappedStatus == db.SubscriptionStatusTrialing {
		update.ClearCancelledAt = true
	}

	if periodStart, hasStart := data["current_period_start"].(string); hasStart {
		if t, parseErr := time.Parse(time.RFC3339, periodStart); parseErr == nil {
			update.CurrentPeriodStart = &t
		}
	}
	if periodEnd, hasEnd := data["current_period_end"].(string); hasEnd {
		if t, parseErr := time.Parse(time.RFC3339, periodEnd); parseErr == nil {
			update.CurrentPeriodEnd = &t
		}
	}

	return s.db.UpsertWorkspaceSubscription(update)
}

// handleSubscriptionCancelled processes subscription cancellation events.
func (s *BillingService) handleSubscriptionCancelled(payload map[string]any) error {
	data, ok := payload["data"].(map[string]any)
	if !ok {
		return errors.New("invalid subscription webhook payload")
	}

	customerID, hasCustomer := extractNestedString(data, "customer_id")
	if !hasCustomer {
		return errors.New("cancellation webhook missing required field: customer_id")
	}
	existing, err := s.findSubscriptionByCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("failed to find subscription for customer %s: %w", customerID, err)
	}

	// Use the cancellation timestamp from the webhook; fall back to server time
	cancelledAt := time.Now()
	if ts, hasTS := extractNestedString(data, "canceled_at"); hasTS {
		if parsed, parseErr := time.Parse(time.RFC3339, ts); parseErr == nil {
			cancelledAt = parsed
		}
	}

	return s.db.UpsertWorkspaceSubscription(&db.WorkspaceSubscription{
		WorkspaceID: existing.WorkspaceID,
		Status:      db.SubscriptionStatusCancelled,
		CancelledAt: &cancelledAt,
	})
}

// findSubscriptionByCustomerID finds a subscription by Polar customer ID.
// Returns an error if customerID is empty to prevent GORM's struct-based Where
// from silently matching the first record in the table.
func (s *BillingService) findSubscriptionByCustomerID(customerID string) (*db.WorkspaceSubscription, error) {
	if customerID == "" {
		return nil, errors.New("empty customer ID")
	}
	var sub db.WorkspaceSubscription
	if err := s.db.Where("polar_customer_id = ?", customerID).First(&sub).Error; err != nil {
		return nil, err
	}
	return &sub, nil
}

// syncSubscriptionFromPolar queries the Polar API for active subscriptions belonging
// to the given customer and upserts the first match into the local database.
// This is a recovery path for when webhook delivery has failed.
func (s *BillingService) syncSubscriptionFromPolar(sub *db.WorkspaceSubscription) error {
	path := fmt.Sprintf("/v1/subscriptions/?customer_id=%s&active=true&limit=1", sub.PolarCustomerID)
	resp, err := s.polarGet(context.Background(), path)
	if err != nil {
		return fmt.Errorf("polar subscriptions list: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	var result struct {
		Items []struct {
			ID                 string  `json:"id"`
			Status             string  `json:"status"`
			ProductID          string  `json:"product_id"`
			CurrentPeriodStart string  `json:"current_period_start"`
			CurrentPeriodEnd   string  `json:"current_period_end"`
			CanceledAt         *string `json:"canceled_at"`
		} `json:"items"`
	}
	if decErr := json.Unmarshal(respBody, &result); decErr != nil {
		return fmt.Errorf("decode response: %w", decErr)
	}

	if len(result.Items) == 0 {
		return nil // no active subscription on Polar
	}

	item := result.Items[0]
	update := &db.WorkspaceSubscription{
		WorkspaceID:         sub.WorkspaceID,
		PolarSubscriptionID: item.ID,
		PolarProductID:      item.ProductID,
		Status:              mapPolarStatus(item.Status),
	}

	if item.CurrentPeriodStart != "" {
		if t, parseErr := time.Parse(time.RFC3339, item.CurrentPeriodStart); parseErr == nil {
			update.CurrentPeriodStart = &t
		}
	}
	if item.CurrentPeriodEnd != "" {
		if t, parseErr := time.Parse(time.RFC3339, item.CurrentPeriodEnd); parseErr == nil {
			update.CurrentPeriodEnd = &t
		}
	}
	if item.CanceledAt != nil {
		if t, parseErr := time.Parse(time.RFC3339, *item.CanceledAt); parseErr == nil {
			update.CancelledAt = &t
		}
	}

	if update.Status == db.SubscriptionStatusActive || update.Status == db.SubscriptionStatusTrialing {
		update.ClearCancelledAt = true
	}

	s.logger.Info("Synced subscription from Polar API",
		"workspace_id", sub.WorkspaceID,
		"polar_status", item.Status,
		"subscription_id", item.ID,
	)

	return s.db.UpsertWorkspaceSubscription(update)
}

// polarGet makes an authenticated GET request to the Polar API.
func (s *BillingService) polarGet(ctx context.Context, path string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+path, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.env.PolarAPIKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		respBody, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		return nil, fmt.Errorf("polar API GET %s returned status %d: %s", path, resp.StatusCode, string(respBody))
	}

	return resp, nil
}

// polarPost makes an authenticated POST request to the Polar API.
// Returns an error for non-2xx responses (including 3xx redirects).
func (s *BillingService) polarPost(ctx context.Context, path string, body []byte) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+path, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.env.PolarAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		respBody, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()

		// Log key prefix for debugging auth failures without exposing the full secret
		const keyPrefixLen = 12
		keyPrefix := s.env.PolarAPIKey
		if len(keyPrefix) > keyPrefixLen {
			keyPrefix = keyPrefix[:keyPrefixLen] + "..."
		}
		s.logger.ErrorContext(ctx, "Polar API error",
			"path", path,
			"status", resp.StatusCode,
			"key_prefix", keyPrefix,
		)

		return nil, fmt.Errorf(
			"polar API POST %s returned status %d: %s",
			path,
			resp.StatusCode,
			string(respBody),
		)
	}

	return resp, nil
}

// parseBillingInfoResponse unmarshals a Polar customer response body into BillingInfo.
// Handles both array format ["value", "type"] and plain string format for tax_id,
// since the Polar API may return either depending on the endpoint/version.
func parseBillingInfoResponse(body []byte) (*irminmodels.BillingInfo, error) {
	var result struct {
		Name           string                      `json:"name"`
		BillingAddress *irminmodels.BillingAddress `json:"billing_address"`
		TaxID          json.RawMessage             `json:"tax_id"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to decode customer response: %w", err)
	}

	info := &irminmodels.BillingInfo{
		Name:           result.Name,
		BillingAddress: result.BillingAddress,
	}

	// Parse tax_id: may be an array ["value", "type"], a plain string, or null
	if result.TaxID != nil && string(result.TaxID) != "null" {
		var taxIDArray []string
		if err := json.Unmarshal(result.TaxID, &taxIDArray); err == nil {
			info.TaxID = taxIDArray
		} else {
			// Fall back to plain string (Polar may return just the value).
			// Pad to 2 elements so the [value, type] contract is preserved for round-trips.
			var taxIDString string
			if strErr := json.Unmarshal(result.TaxID, &taxIDString); strErr == nil && taxIDString != "" {
				info.TaxID = []string{taxIDString, ""}
			}
		}
	}

	return info, nil
}

// GetCustomerBillingInfo retrieves billing info (name, address, tax ID) from Polar.
func (s *BillingService) GetCustomerBillingInfo(polarCustomerID string) (*irminmodels.BillingInfo, error) {
	resp, err := s.polarGet(context.Background(), "/v1/customers/"+polarCustomerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer billing info: %w", err)
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, fmt.Errorf("failed to read customer response: %w", readErr)
	}

	return parseBillingInfoResponse(respBody)
}

// UpdateCustomerBillingInfo updates billing info on the Polar customer.
func (s *BillingService) UpdateCustomerBillingInfo(
	polarCustomerID string,
	info map[string]any,
) (*irminmodels.BillingInfo, error) {
	jsonBody, err := json.Marshal(info)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal billing info update: %w", err)
	}

	resp, err := s.polarPatch(context.Background(), "/v1/customers/"+polarCustomerID, jsonBody)
	if err != nil {
		return nil, fmt.Errorf("failed to update customer billing info: %w", err)
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, fmt.Errorf("failed to read update response: %w", readErr)
	}

	return parseBillingInfoResponse(respBody)
}

// polarPatch makes an authenticated PATCH request to the Polar API.
func (s *BillingService) polarPatch(ctx context.Context, path string, body []byte) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, s.baseURL+path, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.env.PolarAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		respBody, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()

		// For 422 validation errors, extract user-friendly messages from Polar's response
		if resp.StatusCode == http.StatusUnprocessableEntity {
			if msg := parsePolarValidationError(respBody); msg != "" {
				return nil, fmt.Errorf("%w: %s", ErrInvalidRequest, msg)
			}
		}

		return nil, fmt.Errorf("polar API PATCH %s returned status %d: %s", path, resp.StatusCode, string(respBody))
	}

	return resp, nil
}

// mapPolarStatus maps a Polar subscription status string to our SubscriptionStatus type.
func mapPolarStatus(status string) db.SubscriptionStatus {
	switch status {
	case "active":
		return db.SubscriptionStatusActive
	case "canceled":
		return db.SubscriptionStatusCancelled
	case "past_due":
		return db.SubscriptionStatusPastDue
	case "trialing":
		return db.SubscriptionStatusTrialing
	default:
		return db.SubscriptionStatusNone
	}
}

// extractNestedString safely extracts a string value from a map.
func extractNestedString(data map[string]any, key string) (string, bool) {
	val, ok := data[key].(string)
	return val, ok
}

// getMapKeys returns the keys of a map for logging.
func getMapKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// parsePolarValidationError extracts a user-friendly message from a Polar 422 response.
// Polar returns pydantic-style errors: {"error":"RequestValidationError","detail":[{"loc":[...],"msg":"..."}]}
func parsePolarValidationError(body []byte) string {
	var parsed struct {
		Detail []struct {
			Loc []any  `json:"loc"`
			Msg string `json:"msg"`
		} `json:"detail"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil || len(parsed.Detail) == 0 {
		return ""
	}

	// Build a readable message from all validation errors
	messages := make([]string, 0, len(parsed.Detail))
	for _, detail := range parsed.Detail {
		field := ""
		for _, loc := range detail.Loc {
			if s, ok := loc.(string); ok && s != "body" {
				field = s
			}
		}
		if field != "" && detail.Msg != "" {
			messages = append(messages, fmt.Sprintf("%s: %s", field, detail.Msg))
		} else if detail.Msg != "" {
			messages = append(messages, detail.Msg)
		}
	}

	return strings.Join(messages, "; ")
}
