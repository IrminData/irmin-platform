package controllers

import (
	"encoding/json"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"net/url"
	"strconv"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// BillingSubscriptionShow godoc
// @Summary Get workspace billing subscription
// @Tags billing
// @Security ApiKeyAuth
// @Produce json
// @Param workspace path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.PlanInfo}
// @Router /workspaces/{workspace}/billing/subscription [get]
func (api *APIControllers) BillingSubscriptionShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return api.handleServiceError(c, "Error getting locals for BillingSubscriptionShow",
			services.NewInternalError("error getting locals"), dict)
	}

	plan, err := api.Services.BillingService.GetCurrentPlan(workspace.ID)
	if err != nil {
		return api.handleServiceError(c, "Error getting billing plan", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: plan,
	})
}

// BillingUsageShow godoc
// @Summary Get current period usage for workspace
// @Tags billing
// @Security ApiKeyAuth
// @Produce json
// @Param workspace path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.UsageDimensionInfo}
// @Router /workspaces/{workspace}/billing/usage [get]
func (api *APIControllers) BillingUsageShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return api.handleServiceError(c, "Error getting locals for BillingUsageShow",
			services.NewInternalError("error getting locals"), dict)
	}

	summaries, err := api.DB.GetCurrentPeriodUsage(workspace.ID)
	if err != nil {
		return api.handleServiceError(c, "Error getting usage data", err, dict)
	}

	plan, planErr := api.Services.BillingService.GetCurrentPlan(workspace.ID)
	if planErr != nil {
		return api.handleServiceError(c, "Error getting billing plan", planErr, dict)
	}

	usageInfo := buildUsageDimensionInfo(summaries, plan.HasPaymentMethod)

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: usageInfo,
	})
}

// BillingUsageHistory godoc
// @Summary Get usage history for workspace
// @Tags billing
// @Security ApiKeyAuth
// @Produce json
// @Param workspace path string true "Workspace slug"
// @Param periods query int false "Number of periods to retrieve" default(6)
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.UsageHistoryEntry}
// @Router /workspaces/{workspace}/billing/usage/history [get]
func (api *APIControllers) BillingUsageHistory(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return api.handleServiceError(c, "Error getting locals for BillingUsageHistory",
			services.NewInternalError("error getting locals"), dict)
	}

	periods := 6
	if p := c.Query("periods"); p != "" {
		if parsed, parseErr := strconv.Atoi(p); parseErr == nil && parsed > 0 && parsed <= 24 {
			periods = parsed
		}
	}

	summaries, err := api.DB.GetUsageHistory(workspace.ID, periods)
	if err != nil {
		return api.handleServiceError(c, "Error getting usage history", err, dict)
	}

	// Map DB models to API response types to avoid leaking internal fields.
	// Convert byte-based dimensions (storage, data transfer) to GB for display consistency
	// with BillingUsageShow which also returns GB.
	history := make([]irminmodels.UsageHistoryEntry, len(summaries))
	for i, s := range summaries {
		quantity := s.TotalQuantity
		if db.IsByteDimension(s.Dimension) && quantity > 0 {
			quantity /= db.BytesPerGB
		}
		history[i] = irminmodels.UsageHistoryEntry{
			Dimension:     s.Dimension,
			TotalQuantity: quantity,
			PeriodStart:   s.PeriodStart,
			PeriodEnd:     s.PeriodEnd,
		}
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: history,
	})
}

// BillingCheckoutCreate godoc
// @Summary Create a Polar checkout session
// @Tags billing
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace path string true "Workspace slug"
// @Param request body irmincore.CheckoutRequest true "Checkout request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irmincore.CheckoutResponse}
// @Router /workspaces/{workspace}/billing/checkout [post]
func (api *APIControllers) BillingCheckoutCreate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	_, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !userOk || !workspaceOk {
		return api.handleServiceError(c, "Error getting locals for BillingCheckoutCreate",
			services.NewInternalError("error getting locals"), dict)
	}

	var req irmincore.CheckoutRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Validate return URL — must be a relative path or on the console origin (prevent open redirect)
	parsedURL, parseErr := url.Parse(req.ReturnURL)
	if parseErr != nil {
		return api.handleServiceError(c, "Invalid return URL",
			services.ErrInvalidRequest, dict)
	}
	// Block dangerous schemes (javascript:, data:, etc.)
	if parsedURL.Scheme != "" && parsedURL.Scheme != "https" && parsedURL.Scheme != "http" {
		return api.handleServiceError(c, "Invalid return URL scheme",
			services.ErrInvalidRequest, dict)
	}
	// If an absolute URL, it must match the console origin
	if parsedURL.Host != "" {
		consoleURL, _ := url.Parse(api.Env.ConsoleURL)
		if consoleURL == nil || parsedURL.Host != consoleURL.Host {
			consoleHost := ""
			if consoleURL != nil {
				consoleHost = consoleURL.Host
			}
			api.Logger.Warn("Checkout return URL host mismatch",
				"return_url_host", parsedURL.Host,
				"console_url_host", consoleHost,
				"console_url", api.Env.ConsoleURL,
			)
			return api.handleServiceError(c, "Invalid return URL",
				services.ErrInvalidRequest, dict)
		}
	}

	// Get the single product ID
	productID := api.Services.BillingService.GetProductID()

	workspaceSQID, sqidErr := api.SQIDManager.Encode("workspaces", uint64(workspace.ID))
	if sqidErr != nil {
		return api.handleServiceError(c, "Error encoding workspace ID", sqidErr, dict)
	}

	// Reuse existing Polar customer ID if available, otherwise create one.
	// This avoids redundant POST calls to Polar's /v1/customers on repeat checkouts.
	var customerID string
	if sub, subErr := api.DB.GetWorkspaceSubscription(workspace.ID); subErr == nil && sub.PolarCustomerID != "" {
		customerID = sub.PolarCustomerID
	} else {
		var createErr error
		customerID, createErr = api.Services.BillingService.CreateOrGetCustomer(workspaceSQID, workspace.Owner.Email, workspace.Name)
		if createErr != nil {
			return api.handleServiceError(c, "Error creating customer", createErr, dict)
		}

		// Save the customer ID to the subscription record (do not set Status — preserve existing).
		// This must succeed before creating a checkout — otherwise the webhook cannot link
		// the Polar subscription back to this workspace.
		if upsertErr := api.DB.UpsertWorkspaceSubscription(&db.WorkspaceSubscription{
			WorkspaceID:     workspace.ID,
			PolarCustomerID: customerID,
			PolarExternalID: workspaceSQID,
		}); upsertErr != nil {
			return api.handleServiceError(c, "Error saving customer ID", upsertErr, dict)
		}
	}

	// Create checkout session
	checkoutURL, err := api.Services.BillingService.CreateCheckoutSession(
		customerID, productID, req.ReturnURL,
	)
	if err != nil {
		return api.handleServiceError(c, "Error creating checkout session", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: irmincore.CheckoutResponse{
			CheckoutURL: checkoutURL,
		},
	})
}

// BillingPortalCreate godoc
// @Summary Get Polar customer portal URL
// @Tags billing
// @Security ApiKeyAuth
// @Produce json
// @Param workspace path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irmincore.PortalResponse}
// @Router /workspaces/{workspace}/billing/portal [post]
func (api *APIControllers) BillingPortalCreate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return api.handleServiceError(c, "Error getting locals for BillingPortalCreate",
			services.NewInternalError("error getting locals"), dict)
	}

	sub, err := api.DB.GetWorkspaceSubscription(workspace.ID)
	if err != nil || sub.PolarCustomerID == "" {
		return api.handleServiceError(c, "Error getting subscription",
			services.ErrNotFound, dict)
	}

	portalURL, err := api.Services.BillingService.GetCustomerPortalURL(sub.PolarCustomerID)
	if err != nil {
		return api.handleServiceError(c, "Error creating portal session", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: irmincore.PortalResponse{
			PortalURL: portalURL,
		},
	})
}

// BillingInfoShow godoc
// @Summary Get workspace billing info
// @Tags billing
// @Security ApiKeyAuth
// @Produce json
// @Param workspace path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.BillingInfo}
// @Router /workspaces/{workspace}/billing/info [get]
func (api *APIControllers) BillingInfoShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return api.handleServiceError(c, "Error getting locals for BillingInfoShow",
			services.NewInternalError("error getting locals"), dict)
	}

	sub, err := api.DB.GetWorkspaceSubscription(workspace.ID)
	if err != nil || sub.PolarCustomerID == "" {
		// No Polar customer yet — return empty billing info
		return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
			Data: &irminmodels.BillingInfo{},
		})
	}

	info, err := api.Services.BillingService.GetCustomerBillingInfo(sub.PolarCustomerID)
	if err != nil {
		return api.handleServiceError(c, "Error getting billing info", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: info,
	})
}

// BillingInfoUpdate godoc
// @Summary Update workspace billing info
// @Tags billing
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace path string true "Workspace slug"
// @Param request body irmincore.UpdateBillingInfoRequest true "Billing info update"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.BillingInfo}
// @Router /workspaces/{workspace}/billing/info [patch]
func (api *APIControllers) BillingInfoUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return api.handleServiceError(c, "Error getting locals for BillingInfoUpdate",
			services.NewInternalError("error getting locals"), dict)
	}

	var req irmincore.UpdateBillingInfoRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	sub, err := api.DB.GetWorkspaceSubscription(workspace.ID)
	if err != nil || sub.PolarCustomerID == "" {
		return api.handleServiceError(c, "No billing customer exists",
			services.ErrNotFound, dict)
	}

	// Parse raw body to detect which fields were explicitly sent (including null values).
	// Go's json.Unmarshal cannot distinguish "field absent" from "field: null" for slices,
	// so we check the raw JSON keys to support clearing tax_id / billing_address.
	var rawFields map[string]json.RawMessage
	_ = json.Unmarshal(c.Body(), &rawFields)

	// Build update payload for Polar — only include fields present in the request
	updateBody := make(map[string]any)
	if req.Name != nil {
		updateBody["name"] = *req.Name
	}
	if _, hasBillingAddress := rawFields["billing_address"]; hasBillingAddress {
		updateBody["billing_address"] = req.BillingAddress // nil → JSON null (clears on Polar)
	}
	const taxIDPairLen = 2
	if _, hasTaxID := rawFields["tax_id"]; hasTaxID {
		switch {
		case req.TaxID == nil:
			updateBody["tax_id"] = nil // explicit null to clear
		case len(req.TaxID) == taxIDPairLen:
			// Polar API expects tax_id as a plain string (the value only).
			// The type (e.g. "eu_vat") is auto-detected by Polar from the value format.
			updateBody["tax_id"] = req.TaxID[0]
		default:
			return api.handleServiceError(c, "Invalid tax_id: must be a [value, type] pair",
				services.ErrInvalidRequest, dict)
		}
	}

	info, err := api.Services.BillingService.UpdateCustomerBillingInfo(sub.PolarCustomerID, updateBody)
	if err != nil {
		return api.handleServiceError(c, "Error updating billing info", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: info,
	})
}

// PolarWebhook godoc
// @Summary Handle Polar webhook events
// @Tags webhooks
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse
// @Router /api/v1/webhooks/polar [post]
func (api *APIControllers) PolarWebhook(c fiber.Ctx) error {
	payload, payloadOk := c.Locals("polar_payload").(map[string]any)
	eventID, _ := c.Locals("polar_event_id").(string)

	if !payloadOk {
		return api.validateAndWriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Message: "Invalid webhook payload",
		})
	}

	eventType, _ := payload["type"].(string)

	// Process the webhook event
	if err := api.Services.BillingService.HandleWebhookEvent(eventType, payload); err != nil {
		api.Logger.Error("Error processing Polar webhook",
			"event_type", eventType,
			"event_id", eventID,
			"error", err,
		)
		return api.validateAndWriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: "Error processing webhook",
		})
	}

	// Record successful processing for idempotency — only after the handler succeeds.
	// This ensures failed events can be retried by Polar without being permanently blocked.
	if eventID != "" {
		rawBody, _ := c.Locals("polar_raw_body").([]byte)
		billingEvent := &db.BillingEvent{
			PolarEventID: eventID,
			EventType:    eventType,
			Payload:      string(rawBody),
			ProcessedAt:  time.Now(),
		}
		if createErr := api.DB.CreateBillingEvent(billingEvent); createErr != nil {
			api.Logger.Error("Error recording billing event for idempotency", "error", createErr)
		}
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Webhook processed successfully",
	})
}

// dimensionConfig holds display metadata for a usage dimension.
type dimensionConfig struct {
	Dimension   db.UsageDimension
	Unit        string
	RatePerUnit float64
}

// getOrderedDimensions returns the canonical order for usage dimensions in API responses.
func getOrderedDimensions() []dimensionConfig {
	return []dimensionConfig{
		{Dimension: db.UsageDimensionStorage, Unit: "GB", RatePerUnit: db.RateStoragePerGB},
		{Dimension: db.UsageDimensionWorkflowRuns, Unit: "runs", RatePerUnit: db.RateWorkflowRuns},
		{Dimension: db.UsageDimensionAIRequests, Unit: "requests", RatePerUnit: db.RateAIRequests},
		{Dimension: db.UsageDimensionAPIRequests, Unit: "requests", RatePerUnit: db.RateAPIRequests},
		{Dimension: db.UsageDimensionDataTransfer, Unit: "GB", RatePerUnit: db.RateDataTransferPerGB},
		{Dimension: db.UsageDimensionSeats, Unit: "seats", RatePerUnit: db.SeatRate},
	}
}

// buildUsageDimensionInfo creates usage dimension info from summaries.
// Storage and data transfer are converted from bytes (internal) to GB (display).
// For free users (no payment method), code-defined hard limits are applied in display units.
// Dimensions are returned in a stable order defined by getOrderedDimensions.
func buildUsageDimensionInfo(summaries []db.UsageSummary, hasPaymentMethod bool) []irminmodels.UsageDimensionInfo {
	var displayLimits map[db.UsageDimension]int64
	if !hasPaymentMethod {
		displayLimits = db.GetFreeTierDisplayLimits()
	}

	// Index summaries by dimension for O(1) lookup
	summaryMap := make(map[db.UsageDimension]*db.UsageSummary, len(summaries))
	for i := range summaries {
		summaryMap[summaries[i].Dimension] = &summaries[i]
	}

	info := make([]irminmodels.UsageDimensionInfo, 0, len(getOrderedDimensions()))
	for _, cfg := range getOrderedDimensions() {
		var usage int64
		var limit *int64

		if s, ok := summaryMap[cfg.Dimension]; ok {
			usage = s.TotalQuantity
		}

		// Convert bytes to GB for byte-based dimensions
		if db.IsByteDimension(cfg.Dimension) && usage > 0 {
			usage /= db.BytesPerGB
		}

		if displayLimits != nil {
			if hl, ok := displayLimits[cfg.Dimension]; ok {
				limit = &hl
			}
		}

		info = append(info, irminmodels.UsageDimensionInfo{
			Dimension:    cfg.Dimension,
			CurrentUsage: usage,
			Limit:        limit,
			Unit:         cfg.Unit,
			RatePerUnit:  cfg.RatePerUnit,
		})
	}

	return info
}
