package db

import (
	"errors"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Type aliases for SDK billing types, used throughout the core API.
type (
	// SubscriptionStatus represents the status of a subscription.
	SubscriptionStatus = irminmodels.SubscriptionStatus
	// UsageDimension represents a usage tracking dimension.
	UsageDimension = irminmodels.UsageDimension
)

// Subscription status constants re-exported from SDK for convenience.
const (
	SubscriptionStatusActive    = irminmodels.SubscriptionStatusActive
	SubscriptionStatusCancelled = irminmodels.SubscriptionStatusCancelled
	SubscriptionStatusPastDue   = irminmodels.SubscriptionStatusPastDue
	SubscriptionStatusTrialing  = irminmodels.SubscriptionStatusTrialing
	SubscriptionStatusNone      = irminmodels.SubscriptionStatusNone
)

// Usage dimension constants re-exported from SDK for convenience.
const (
	UsageDimensionStorage            = irminmodels.UsageDimensionStorage
	UsageDimensionWorkflowRuns       = irminmodels.UsageDimensionWorkflowRuns
	UsageDimensionAIRequests         = irminmodels.UsageDimensionAIRequests
	UsageDimensionAPIRequests        = irminmodels.UsageDimensionAPIRequests
	UsageDimensionDataTransfer       = irminmodels.UsageDimensionDataTransfer
	UsageDimensionSeats              = irminmodels.UsageDimensionSeats
	UsageDimensionComputeInvocations = irminmodels.UsageDimensionComputeInvocations
	UsageDimensionVectorizations     = irminmodels.UsageDimensionVectorizations
)

// Usage-based billing constants.
const (
	// CreditPerMeter is the free credit in EUR per meter per month.
	CreditPerMeter = 2.0
	// MeterCount is the total number of usage meters.
	MeterCount = 8
	// TotalFreeCredit is the total free credit in EUR per month (CreditPerMeter * MeterCount).
	TotalFreeCredit = 16.0
	// SeatRate is the cost in EUR per extra seat per month.
	SeatRate = 5.0
)

// Usage rate constants (EUR per unit) for billing dimension display.
// Storage and data transfer rates are per GB. Internal tracking uses bytes
// but values are converted to GB when reported to Polar and displayed in the UI.
const (
	RateStoragePerGB       = 0.02   // 0.02 € / GB
	RateWorkflowRuns       = 0.01   // 0.01 € / run
	RateAIRequests         = 0.05   // 0.05 € / request
	RateAPIRequests        = 0.0005 // 0.50 € / 1K = 0.0005 € / request
	RateDataTransferPerGB  = 0.05   // 0.05 € / GB
	RateComputeInvocations = 0.01   // 0.01 € / invocation
	RateVectorizations     = 0.001  // 0.001 € / document vectorized
)

// Free tier hard limit constants for users without a payment method.
// Storage and data transfer limits are in bytes (used for internal enforcement).
const (
	FreeStorageBytes       = 5 * 1_000_000_000  // 5 GB in bytes
	FreeStorageGB          = 5                  // 5 GB (for Polar benefits / display)
	FreeWorkflowRuns       = 200                // 200 runs
	FreeAIRequests         = 40                 // 40 requests
	FreeAPIRequests        = 4000               // 4,000 requests
	FreeDataTransferBytes  = 40 * 1_000_000_000 // 40 GB in bytes
	FreeDataTransferGB     = 40                 // 40 GB (for Polar benefits / display)
	FreeExtraSeats         = 0                  // 0 extra seats (1 member free)
	FreeComputeInvocations = 100                // 100 invocations
	FreeVectorizations     = 1000               // 1000 documents
)

// BytesPerGB is the number of bytes in a gigabyte (decimal, matching storage industry convention).
const BytesPerGB = 1_000_000_000

// IsByteDimension returns true for dimensions that are tracked in bytes internally
// and should be converted to GB for display and external reporting.
func IsByteDimension(dim UsageDimension) bool {
	return dim == UsageDimensionStorage || dim == UsageDimensionDataTransfer
}

// GetFreeTierHardLimits returns the hard usage limits for users without a payment method.
// Storage and data transfer limits are in bytes for precise internal enforcement.
func GetFreeTierHardLimits() map[UsageDimension]int64 {
	return map[UsageDimension]int64{
		UsageDimensionStorage:            FreeStorageBytes,
		UsageDimensionWorkflowRuns:       FreeWorkflowRuns,
		UsageDimensionAIRequests:         FreeAIRequests,
		UsageDimensionAPIRequests:        FreeAPIRequests,
		UsageDimensionDataTransfer:       FreeDataTransferBytes,
		UsageDimensionSeats:              FreeExtraSeats,
		UsageDimensionComputeInvocations: FreeComputeInvocations,
		UsageDimensionVectorizations:     FreeVectorizations,
	}
}

// GetFreeTierDisplayLimits returns the hard usage limits in display units (GB for storage/transfer).
// Used for API responses and Polar benefits configuration.
func GetFreeTierDisplayLimits() map[UsageDimension]int64 {
	return map[UsageDimension]int64{
		UsageDimensionStorage:            FreeStorageGB,
		UsageDimensionWorkflowRuns:       FreeWorkflowRuns,
		UsageDimensionAIRequests:         FreeAIRequests,
		UsageDimensionAPIRequests:        FreeAPIRequests,
		UsageDimensionDataTransfer:       FreeDataTransferGB,
		UsageDimensionSeats:              FreeExtraSeats,
		UsageDimensionComputeInvocations: FreeComputeInvocations,
		UsageDimensionVectorizations:     FreeVectorizations,
	}
}

// CountWorkspaceMembersAndInvites returns the total number of active members and pending invites for a workspace.
func (d *Database) CountWorkspaceMembersAndInvites(workspaceID uint) (int64, error) {
	var memberCount int64
	if err := d.Model(&WorkspaceUser{}).Where("workspace_id = ?", workspaceID).Count(&memberCount).Error; err != nil {
		return 0, err
	}

	var inviteCount int64
	if err := d.Model(&Invite{}).
		Where("workspace_id = ? AND accepted_at IS NULL AND declined_at IS NULL AND expires_at > ?", workspaceID, time.Now()).
		Count(&inviteCount).Error; err != nil {
		return 0, err
	}

	return memberCount + inviteCount, nil
}

// WorkspaceSubscription represents a workspace's billing subscription.
type WorkspaceSubscription struct {
	gorm.Model
	WorkspaceID         uint               `json:"workspace_id"          gorm:"uniqueIndex"`
	PolarCustomerID     string             `json:"polar_customer_id"     gorm:"index"`
	PolarExternalID     string             `json:"polar_external_id"`
	PolarSubscriptionID string             `json:"polar_subscription_id"`
	PolarProductID      string             `json:"polar_product_id"`
	Status              SubscriptionStatus `json:"status"                gorm:"default:none"`
	CurrentPeriodStart  *time.Time         `json:"current_period_start"`
	CurrentPeriodEnd    *time.Time         `json:"current_period_end"`
	CancelledAt         *time.Time         `json:"cancelled_at"`

	// ClearCancelledAt signals that cancelled_at should be set to NULL during upsert.
	// This is needed because nil pointer fields are otherwise skipped by the update logic.
	ClearCancelledAt bool `json:"-" gorm:"-"`
}

// UsageRecord represents an individual usage event.
type UsageRecord struct {
	gorm.Model
	WorkspaceID     uint           `json:"workspace_id"      gorm:"index:idx_usage_record_composite,priority:1"`
	Dimension       UsageDimension `json:"dimension"         gorm:"index:idx_usage_record_composite,priority:2"`
	Quantity        int64          `json:"quantity"`
	PeriodStart     time.Time      `json:"period_start"      gorm:"index:idx_usage_record_composite,priority:3"`
	PeriodEnd       time.Time      `json:"period_end"`
	ReportedToPolar bool           `json:"reported_to_polar" gorm:"default:false;index"`
}

// UsageSummary represents aggregated usage per workspace/dimension/period.
type UsageSummary struct {
	gorm.Model
	WorkspaceID   uint           `json:"workspace_id"   gorm:"uniqueIndex:idx_usage_summary_unique,priority:1"`
	Dimension     UsageDimension `json:"dimension"      gorm:"uniqueIndex:idx_usage_summary_unique,priority:2"`
	PeriodStart   time.Time      `json:"period_start"   gorm:"uniqueIndex:idx_usage_summary_unique,priority:3"`
	PeriodEnd     time.Time      `json:"period_end"`
	TotalQuantity int64          `json:"total_quantity" gorm:"default:0"`
}

// BillingEvent represents a webhook event for idempotency and auditing.
type BillingEvent struct {
	gorm.Model
	PolarEventID string    `json:"polar_event_id" gorm:"uniqueIndex"`
	EventType    string    `json:"event_type"`
	Payload      string    `json:"payload"        gorm:"type:jsonb"`
	ProcessedAt  time.Time `json:"processed_at"`
}

// GetWorkspaceSubscription retrieves the subscription for a workspace.
func (d *Database) GetWorkspaceSubscription(workspaceID uint) (*WorkspaceSubscription, error) {
	var sub WorkspaceSubscription
	if err := d.Where(&WorkspaceSubscription{WorkspaceID: workspaceID}).First(&sub).Error; err != nil {
		return nil, err
	}
	return &sub, nil
}

// UpsertWorkspaceSubscription creates or updates a workspace subscription atomically.
// Only non-zero fields on sub are written, preserving existing values.
// Uses a transaction with SELECT FOR UPDATE to prevent race conditions between
// concurrent checkout requests and webhook handlers for the same workspace.
func (d *Database) UpsertWorkspaceSubscription(sub *WorkspaceSubscription) error {
	return d.Transaction(func(tx *gorm.DB) error {
		var existing WorkspaceSubscription
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("workspace_id = ?", sub.WorkspaceID).
			First(&existing).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return tx.Create(sub).Error
			}
			return err
		}

		updates := buildSubscriptionUpdates(sub)
		if len(updates) == 0 {
			return nil
		}

		return tx.Model(&existing).Updates(updates).Error
	})
}

// buildSubscriptionUpdates builds a map of non-zero fields to update on a workspace subscription.
func buildSubscriptionUpdates(sub *WorkspaceSubscription) map[string]any {
	updates := map[string]any{}
	if sub.PolarCustomerID != "" {
		updates["polar_customer_id"] = sub.PolarCustomerID
	}
	if sub.PolarExternalID != "" {
		updates["polar_external_id"] = sub.PolarExternalID
	}
	if sub.PolarSubscriptionID != "" {
		updates["polar_subscription_id"] = sub.PolarSubscriptionID
	}
	if sub.PolarProductID != "" {
		updates["polar_product_id"] = sub.PolarProductID
	}
	if sub.Status != "" {
		updates["status"] = sub.Status
	}
	if sub.CurrentPeriodStart != nil {
		updates["current_period_start"] = sub.CurrentPeriodStart
	}
	if sub.CurrentPeriodEnd != nil {
		updates["current_period_end"] = sub.CurrentPeriodEnd
	}
	if sub.CancelledAt != nil {
		updates["cancelled_at"] = sub.CancelledAt
	}
	if sub.ClearCancelledAt {
		updates["cancelled_at"] = nil
	}

	return updates
}

// CreateUsageRecordsBatch inserts multiple usage records in a single batch.
func (d *Database) CreateUsageRecordsBatch(records []*UsageRecord) error {
	if len(records) == 0 {
		return nil
	}
	return d.Create(&records).Error
}

// GetCurrentPeriodUsage returns usage summaries for the current billing period of a workspace.
func (d *Database) GetCurrentPeriodUsage(workspaceID uint) ([]UsageSummary, error) {
	var summaries []UsageSummary
	now := time.Now().UTC()
	if err := d.Where(
		"workspace_id = ? AND period_start <= ? AND period_end >= ?",
		workspaceID, now, now,
	).Find(&summaries).Error; err != nil {
		return nil, err
	}
	return summaries, nil
}

// GetUsageHistory returns usage summaries for a workspace over the most recent N billing periods.
// Uses a subquery on distinct period_starts so the result is correct regardless of how many
// dimensions each period has.
func (d *Database) GetUsageHistory(workspaceID uint, periods int) ([]UsageSummary, error) {
	var summaries []UsageSummary
	periodSubquery := d.Model(&UsageSummary{}).
		Select("DISTINCT period_start").
		Where("workspace_id = ?", workspaceID).
		Order("period_start DESC").
		Limit(periods)

	if err := d.Where("workspace_id = ? AND period_start IN (?)", workspaceID, periodSubquery).
		Order("period_start DESC").
		Find(&summaries).Error; err != nil {
		return nil, err
	}
	return summaries, nil
}

// GetUnreportedUsageRecords returns usage records that haven't been reported to Polar.
func (d *Database) GetUnreportedUsageRecords(limit int) ([]UsageRecord, error) {
	var records []UsageRecord
	if err := d.Where("reported_to_polar = false").
		Order("created_at ASC").
		Limit(limit).
		Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

// MarkUsageRecordsReported marks usage records as reported to Polar.
func (d *Database) MarkUsageRecordsReported(ids []uint) error {
	if len(ids) == 0 {
		return nil
	}
	return d.Model(&UsageRecord{}).Where("id IN ?", ids).
		Update("reported_to_polar", true).Error
}

// CreateBillingEvent creates a billing event for idempotency.
func (d *Database) CreateBillingEvent(event *BillingEvent) error {
	return d.Create(event).Error
}

// GetBillingEventByPolarID retrieves a billing event by its Polar event ID.
func (d *Database) GetBillingEventByPolarID(polarEventID string) (*BillingEvent, error) {
	var event BillingEvent
	if err := d.Where(&BillingEvent{PolarEventID: polarEventID}).First(&event).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

// AggregateUsageSummaries aggregates usage records into summaries for the given period.
// Seats and storage use MAX aggregation (gauge — peak value for in-app display).
// Polar computes the billing average for storage separately from individual snapshot events.
// All other dimensions use SUM (counter).
func (d *Database) AggregateUsageSummaries(periodStart, periodEnd time.Time) error {
	return d.Exec(`
		INSERT INTO usage_summaries (workspace_id, dimension, period_start, period_end, total_quantity, created_at, updated_at)
		SELECT workspace_id, dimension, ?, ?,
			CASE WHEN dimension IN ('seats', 'storage') THEN COALESCE(MAX(quantity), 0)
			     ELSE COALESCE(SUM(quantity), 0)
			END,
			NOW(), NOW()
		FROM usage_records
		WHERE period_start >= ? AND period_end <= ? AND deleted_at IS NULL
		GROUP BY workspace_id, dimension
		ON CONFLICT (workspace_id, dimension, period_start)
		DO UPDATE SET total_quantity = EXCLUDED.total_quantity, updated_at = NOW()
	`, periodStart, periodEnd, periodStart, periodEnd).Error
}
