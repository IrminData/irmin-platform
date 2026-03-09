package irminmodels

import "time"

// PlanTier represents the billing plan tier.
type PlanTier string

const (
	// PlanTierHobby represents the hobby plan tier.
	PlanTierHobby PlanTier = "hobby"
	// PlanTierPro represents the pro plan tier.
	PlanTierPro PlanTier = "pro"
	// PlanTierTeam represents the team plan tier.
	PlanTierTeam PlanTier = "team"
	// PlanTierEnterprise represents the enterprise plan tier.
	PlanTierEnterprise PlanTier = "enterprise"
)

// BillingInterval represents the billing interval.
type BillingInterval string

const (
	// BillingIntervalMonthly represents monthly billing.
	BillingIntervalMonthly BillingInterval = "monthly"
	// BillingIntervalAnnual represents annual billing.
	BillingIntervalAnnual BillingInterval = "annual"
)

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
)

// PlanInfo holds information about a workspace's current plan.
type PlanInfo struct {
	Tier                PlanTier           `json:"tier"                  example:"pro"`
	Status              SubscriptionStatus `json:"status"                example:"active"`
	BillingInterval     BillingInterval    `json:"billing_interval"      example:"monthly"`
	PeriodStart         *time.Time         `json:"current_period_start"  example:"2025-01-01T00:00:00Z"`
	PeriodEnd           *time.Time         `json:"current_period_end"    example:"2025-02-01T00:00:00Z"`
	CancelledAt         *time.Time         `json:"cancelled_at"          example:"2025-03-15T12:00:00Z"`
	IncludedUsageCredit float64            `json:"included_usage_credit" example:"20.00"`
}

// UsageDimensionInfo holds usage info for a single dimension in the current period.
type UsageDimensionInfo struct {
	Dimension    UsageDimension `json:"dimension"     example:"api_requests"`
	CurrentUsage int64          `json:"current_usage" example:"1250"`
	Limit        *int64         `json:"limit"         example:"10000"`
	Unit         string         `json:"unit"          example:"requests"`
	RatePerUnit  float64        `json:"rate_per_unit" example:"0.001"`
}

// UsageHistoryEntry holds a usage summary for a specific dimension and billing period.
type UsageHistoryEntry struct {
	Dimension      UsageDimension `json:"dimension"        example:"api_requests"`
	TotalQuantity  int64          `json:"total_quantity"   example:"1250"`
	UsageLimitHard *int64         `json:"usage_limit_hard" example:"10000"`
	PeriodStart    time.Time      `json:"period_start"     example:"2025-01-01T00:00:00Z"`
	PeriodEnd      time.Time      `json:"period_end"       example:"2025-02-01T00:00:00Z"`
}
