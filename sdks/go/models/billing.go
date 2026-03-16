package irminmodels

import "time"

// SubscriptionStatus represents the status of a subscription.
type SubscriptionStatus string

const (
	// SubscriptionStatusActive represents an active subscription.
	SubscriptionStatusActive SubscriptionStatus = "active"
	// SubscriptionStatusCancelled represents a cancelled subscription.
	SubscriptionStatusCancelled SubscriptionStatus = "cancelled"
	// SubscriptionStatusPastDue represents a past due subscription.
	SubscriptionStatusPastDue SubscriptionStatus = "past_due"
	// SubscriptionStatusTrialing represents a trialing subscription.
	SubscriptionStatusTrialing SubscriptionStatus = "trialing"
	// SubscriptionStatusNone represents no active subscription.
	SubscriptionStatusNone SubscriptionStatus = "none"
)

// UsageDimension represents a usage tracking dimension.
type UsageDimension string

const (
	// UsageDimensionStorage represents storage usage.
	UsageDimensionStorage UsageDimension = "storage"
	// UsageDimensionWorkflowRuns represents workflow run usage.
	UsageDimensionWorkflowRuns UsageDimension = "workflow_runs"
	// UsageDimensionAIRequests represents AI request usage.
	UsageDimensionAIRequests UsageDimension = "ai_requests"
	// UsageDimensionAPIRequests represents API request usage.
	UsageDimensionAPIRequests UsageDimension = "api_requests"
	// UsageDimensionDataTransfer represents data transfer usage.
	UsageDimensionDataTransfer UsageDimension = "data_transfer"
	// UsageDimensionSeats represents seat usage.
	UsageDimensionSeats UsageDimension = "seats"
	// UsageDimensionComputeInvocations represents compute sandbox invocation usage.
	UsageDimensionComputeInvocations UsageDimension = "compute_invocations"
	// UsageDimensionVectorizations represents document vectorization usage.
	UsageDimensionVectorizations UsageDimension = "vectorizations"
)

// PlanInfo holds information about a workspace's current plan.
type PlanInfo struct {
	Status           SubscriptionStatus `json:"status"               example:"active"`
	HasPaymentMethod bool               `json:"has_payment_method"   example:"true"`
	PeriodStart      *time.Time         `json:"current_period_start" example:"2025-01-01T00:00:00Z"`
	PeriodEnd        *time.Time         `json:"current_period_end"   example:"2025-02-01T00:00:00Z"`
	CancelledAt      *time.Time         `json:"cancelled_at"         example:"2025-03-15T12:00:00Z"`
	CreditPerMeter   float64            `json:"credit_per_meter"     example:"2.00"`
	TotalCredit      float64            `json:"total_credit"         example:"12.00"`
}

// UsageDimensionInfo holds usage info for a single dimension in the current period.
type UsageDimensionInfo struct {
	Dimension    UsageDimension `json:"dimension"     example:"api_requests"`
	CurrentUsage int64          `json:"current_usage" example:"1250"`
	Limit        *int64         `json:"limit"         example:"10000"`
	Unit         string         `json:"unit"          example:"requests"`
	RatePerUnit  float64        `json:"rate_per_unit" example:"0.001"`
}

// BillingAddress holds a billing address.
type BillingAddress struct {
	Line1      string `json:"line1"       example:"123 Main St"`
	Line2      string `json:"line2"       example:"Suite 100"`
	City       string `json:"city"        example:"Helsinki"`
	State      string `json:"state"       example:"Uusimaa"`
	PostalCode string `json:"postal_code" example:"00100"`
	Country    string `json:"country"     example:"FI"`
}

// BillingInfoTaxID is a two-element array [value, type] for tax identification (e.g. ["FI12345678", "eu_vat"]).
type BillingInfoTaxID = []string

// BillingInfo holds billing information for a workspace customer.
type BillingInfo struct {
	Name           string           `json:"name"            example:"Acme Corp"`
	BillingAddress *BillingAddress  `json:"billing_address"`
	TaxID          BillingInfoTaxID `json:"tax_id"`
}

// UsageHistoryEntry holds a usage summary for a specific dimension and billing period.
type UsageHistoryEntry struct {
	Dimension     UsageDimension `json:"dimension"      example:"api_requests"`
	TotalQuantity int64          `json:"total_quantity" example:"1250"`
	PeriodStart   time.Time      `json:"period_start"   example:"2025-01-01T00:00:00Z"`
	PeriodEnd     time.Time      `json:"period_end"     example:"2025-02-01T00:00:00Z"`
}
