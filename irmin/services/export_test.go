package services

import (
	"context"
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// This file exports internal functions for testing purposes.
// These exports are only available during testing (file ends with _test.go).

// ExportApplySecretMasking exports applySecretMasking method for testing.
var ExportApplySecretMasking = func(
	api *APIServices,
	connections []*db.Connection,
	schemas map[uint]map[string]irminmodels.DynamicField,
) {
	api.applySecretMasking(connections, schemas)
}

// ExportProcessSecretUpdates exports processSecretUpdates method for testing.
var ExportProcessSecretUpdates = func(
	api *APIServices,
	current map[string]string,
	updates map[string]any,
) map[string]string {
	return api.processSecretUpdates(current, updates)
}

// ExportCreatePolicyInTransaction exports createPolicyInTransaction method for testing.
// Returns (replaced bool, err error) where replaced indicates if an existing policy was replaced.
var ExportCreatePolicyInTransaction = func(
	api *APIServices,
	ctx context.Context,
	workspace *db.Workspace,
	newPolicy *db.Policy,
) (bool, error) {
	return api.createPolicyInTransaction(ctx, workspace, newPolicy)
}

// ExportMapPolarStatus exports mapPolarStatus for testing.
var ExportMapPolarStatus = mapPolarStatus

// ExportExtractNestedString exports extractNestedString for testing.
var ExportExtractNestedString = extractNestedString

// ExportGetMapKeys exports getMapKeys for testing.
var ExportGetMapKeys = getMapKeys

// UsageEvent is an exported alias of usageEvent for testing.
type UsageEvent = usageEvent

// ExportEventToRecord exports eventToRecord for testing.
var ExportEventToRecord = func(t *UsageTracker, evt UsageEvent) *db.UsageRecord {
	return t.eventToRecord(evt)
}

// NewBillingServiceWithBaseURL creates a billing service with a custom base URL for testing.
func NewBillingServiceWithBaseURL(
	database *db.Database,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
	baseURL string,
) *BillingService {
	s := NewBillingService(database, env, logger)
	if s != nil {
		s.baseURL = baseURL
	}
	return s
}
