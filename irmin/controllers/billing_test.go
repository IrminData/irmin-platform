package controllers_test

import (
	"testing"

	"irmin-api/controllers"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// TestBuildUsageDimensionInfo_Empty tests building usage info with no summaries.
func TestBuildUsageDimensionInfo_Empty(t *testing.T) {
	info := controllers.ExportBuildUsageDimensionInfo(nil, true)
	// Should return all 6 dimensions with zero usage
	assert.Equal(t, 6, len(info))

	for _, dim := range info {
		assert.Equal(t, int64(0), dim.CurrentUsage)
		assert.True(t, dim.Unit != "")
	}
}

// TestBuildUsageDimensionInfo_Partial tests with some dimensions present.
func TestBuildUsageDimensionInfo_Partial(t *testing.T) {
	summaries := []db.UsageSummary{
		{
			Dimension:     db.UsageDimensionStorage,
			TotalQuantity: 5 * db.BytesPerGB, // 5 GB in bytes
		},
		{
			Dimension:     db.UsageDimensionAPIRequests,
			TotalQuantity: 1000,
		},
	}

	info := controllers.ExportBuildUsageDimensionInfo(summaries, true)
	// Should still return all 6 dimensions
	assert.Equal(t, 6, len(info))

	// Check the provided dimensions have correct usage
	dimUsage := make(map[irminmodels.UsageDimension]int64)
	for _, d := range info {
		dimUsage[d.Dimension] = d.CurrentUsage
	}

	// Storage is converted from bytes to GB
	assert.Equal(t, int64(5), dimUsage[db.UsageDimensionStorage])
	assert.Equal(t, int64(1000), dimUsage[db.UsageDimensionAPIRequests])
	// Missing dimensions should be zero
	assert.Equal(t, int64(0), dimUsage[db.UsageDimensionWorkflowRuns])
	assert.Equal(t, int64(0), dimUsage[db.UsageDimensionAIRequests])
	assert.Equal(t, int64(0), dimUsage[db.UsageDimensionDataTransfer])
	assert.Equal(t, int64(0), dimUsage[db.UsageDimensionSeats])
}

// TestBuildUsageDimensionInfo_Full tests with all dimensions present.
func TestBuildUsageDimensionInfo_Full(t *testing.T) {
	summaries := []db.UsageSummary{
		{Dimension: db.UsageDimensionStorage, TotalQuantity: 100 * db.BytesPerGB},
		{Dimension: db.UsageDimensionWorkflowRuns, TotalQuantity: 200},
		{Dimension: db.UsageDimensionAIRequests, TotalQuantity: 300},
		{Dimension: db.UsageDimensionAPIRequests, TotalQuantity: 400},
		{Dimension: db.UsageDimensionDataTransfer, TotalQuantity: 500 * db.BytesPerGB},
		{Dimension: db.UsageDimensionSeats, TotalQuantity: 2},
	}

	info := controllers.ExportBuildUsageDimensionInfo(summaries, true)
	assert.Equal(t, 6, len(info))

	// Subscriber: no limits injected
	for _, d := range info {
		if d.Limit != nil {
			t.Errorf("expected nil limit for subscriber dimension %s", d.Dimension)
		}
	}
}

// TestBuildUsageDimensionInfo_FreeLimits tests that free users (no payment method) get code-defined hard limits.
func TestBuildUsageDimensionInfo_FreeLimits(t *testing.T) {
	// With no summaries and no payment method, all dimensions should have free tier limits
	info := controllers.ExportBuildUsageDimensionInfo(nil, false)
	assert.Equal(t, 6, len(info))

	freeLimits := db.GetFreeTierDisplayLimits()
	for _, dim := range info {
		expectedLimit, exists := freeLimits[dim.Dimension]
		assert.True(t, exists)
		assert.NotNil(t, dim.Limit)
		assert.Equal(t, expectedLimit, *dim.Limit)
	}
}

// TestBuildUsageDimensionInfo_FreeWithSummaries tests free limits are applied alongside summaries.
func TestBuildUsageDimensionInfo_FreeWithSummaries(t *testing.T) {
	summaries := []db.UsageSummary{
		{Dimension: db.UsageDimensionStorage, TotalQuantity: 5 * db.BytesPerGB},
	}
	info := controllers.ExportBuildUsageDimensionInfo(summaries, false)
	assert.Equal(t, 6, len(info))

	for _, dim := range info {
		// All dimensions should have limits for free users, regardless of DB data
		assert.NotNil(t, dim.Limit)
	}
}

// TestBuildUsageDimensionInfo_SubscriberNoLimitsInjected tests that subscribers don't get free tier limits.
func TestBuildUsageDimensionInfo_SubscriberNoLimitsInjected(t *testing.T) {
	info := controllers.ExportBuildUsageDimensionInfo(nil, true)

	for _, dim := range info {
		// Subscriber with no summaries should have nil limits (no free tier fallback)
		if dim.Limit != nil {
			t.Errorf("expected nil limit for subscriber dimension %s, got %d", dim.Dimension, *dim.Limit)
		}
	}
}

// TestBuildUsageDimensionInfo_Rates tests that rate and unit values are set correctly.
func TestBuildUsageDimensionInfo_Rates(t *testing.T) {
	info := controllers.ExportBuildUsageDimensionInfo(nil, true)

	rateMap := make(map[irminmodels.UsageDimension]float64)
	unitMap := make(map[irminmodels.UsageDimension]string)
	for _, d := range info {
		rateMap[d.Dimension] = d.RatePerUnit
		unitMap[d.Dimension] = d.Unit
	}

	// Storage and data transfer rates are per-byte (0.02 € / GB divided by 1e9)
	assert.Equal(t, db.RateStoragePerGB, rateMap[db.UsageDimensionStorage])
	assert.Equal(t, db.RateWorkflowRuns, rateMap[db.UsageDimensionWorkflowRuns])
	assert.Equal(t, db.RateAIRequests, rateMap[db.UsageDimensionAIRequests])
	assert.Equal(t, db.RateAPIRequests, rateMap[db.UsageDimensionAPIRequests])
	assert.Equal(t, db.RateDataTransferPerGB, rateMap[db.UsageDimensionDataTransfer])
	assert.Equal(t, db.SeatRate, rateMap[db.UsageDimensionSeats])

	assert.Equal(t, "GB", unitMap[db.UsageDimensionStorage])
	assert.Equal(t, "runs", unitMap[db.UsageDimensionWorkflowRuns])
	assert.Equal(t, "requests", unitMap[db.UsageDimensionAIRequests])
	assert.Equal(t, "requests", unitMap[db.UsageDimensionAPIRequests])
	assert.Equal(t, "GB", unitMap[db.UsageDimensionDataTransfer])
	assert.Equal(t, "seats", unitMap[db.UsageDimensionSeats])
}
