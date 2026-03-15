package services

import (
	"context"
	"irmin-api/bucket"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log/slog"
	"strings"
	"sync"
	"time"
)

const (
	usageChannelCapacity   = 10000
	usageBatchInterval     = 10 * time.Second
	usageBatchSize         = 100
	usagePolarSyncInterval = 5 * time.Minute
	usagePolarBatchLimit   = 500
	seatReportInterval     = 1 * time.Hour
	storageReportInterval  = 1 * time.Hour
)

// usageEvent represents an internal usage event to be batched.
type usageEvent struct {
	WorkspaceID uint
	Dimension   db.UsageDimension
	Quantity    int64
	Timestamp   time.Time
}

// UsageTracker handles async, buffered usage tracking.
type UsageTracker struct {
	db             *db.Database
	billingService *BillingService
	lakefsClient   *lakefs.Client
	lakefsBucket   *bucket.Client
	logger         *slog.Logger
	events         chan usageEvent
}

// NewUsageTracker creates a new usage tracker. Returns nil if billing is disabled.
func NewUsageTracker(
	database *db.Database,
	billingService *BillingService,
	lakefsClient *lakefs.Client,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
) *UsageTracker {
	if billingService == nil {
		return nil
	}

	// Create a bucket client for the LakeFS S3 bucket so we can measure actual storage.
	var lakefsBucketClient *bucket.Client
	if env != nil && env.LakeFSS3Bucket != "" {
		client, err := bucket.CreateClient(env, env.LakeFSS3Bucket, database)
		if err != nil {
			logger.Error("Failed to create LakeFS bucket client for storage metering", "error", err)
		} else {
			lakefsBucketClient = client
		}
	}

	return &UsageTracker{
		db:             database,
		billingService: billingService,
		lakefsClient:   lakefsClient,
		lakefsBucket:   lakefsBucketClient,
		logger:         logger,
		events:         make(chan usageEvent, usageChannelCapacity),
	}
}

// TrackSeats emits a seat-count usage event for the given workspace.
// The quantity is (member + pending invite count) - 1, since the first seat is free.
func (t *UsageTracker) TrackSeats(workspaceID uint) {
	if t == nil {
		return
	}
	count, err := t.db.CountWorkspaceMembersAndInvites(workspaceID)
	if err != nil {
		t.logger.Error("Failed to count workspace members for seat tracking", "error", err, "workspace_id", workspaceID)
		return
	}
	// First member is free — track only extra seats
	extraSeats := count - 1
	if extraSeats < 0 {
		extraSeats = 0
	}
	t.Track(workspaceID, db.UsageDimensionSeats, extraSeats)
}

// Track records a usage event. Non-blocking — drops events if the channel is full.
func (t *UsageTracker) Track(workspaceID uint, dimension db.UsageDimension, quantity int64) {
	if t == nil {
		return
	}
	select {
	case t.events <- usageEvent{
		WorkspaceID: workspaceID,
		Dimension:   dimension,
		Quantity:    quantity,
		Timestamp:   time.Now(),
	}:
	default:
		t.logger.Warn("Usage tracking channel full, dropping event",
			"workspace_id", workspaceID,
			"dimension", dimension,
		)
	}
}

// Start begins the background processing goroutines. Blocks until ctx is cancelled.
func (t *UsageTracker) Start(ctx context.Context) error {
	if t == nil {
		return nil
	}

	var wg sync.WaitGroup

	// Batch writer goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		t.batchWriter(ctx)
	}()

	// Polar sync goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		t.polarSyncer(ctx)
	}()

	// Seat reporter goroutine — periodically emits seat counts for all workspaces
	wg.Add(1)
	go func() {
		defer wg.Done()
		t.seatReporter(ctx)
	}()

	// Storage reporter goroutine — periodically snapshots actual storage from LakeFS
	wg.Add(1)
	go func() {
		defer wg.Done()
		t.storageReporter(ctx)
	}()

	wg.Wait()
	return nil
}

// batchWriter collects events and writes them to the database in batches.
func (t *UsageTracker) batchWriter(ctx context.Context) {
	batch := make([]*db.UsageRecord, 0, usageBatchSize)
	ticker := time.NewTicker(usageBatchInterval)
	defer ticker.Stop()

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := t.db.CreateUsageRecordsBatch(batch); err != nil {
			t.logger.ErrorContext(ctx, "Failed to write usage records batch", "error", err, "count", len(batch))
		}
		batch = make([]*db.UsageRecord, 0, usageBatchSize)
	}

	for {
		select {
		case <-ctx.Done():
			// Drain remaining events
			for {
				select {
				case evt := <-t.events:
					batch = append(batch, t.eventToRecord(evt))
				default:
					flush()
					return
				}
			}
		case evt := <-t.events:
			batch = append(batch, t.eventToRecord(evt))
			if len(batch) >= usageBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

// polarSyncer periodically aggregates usage summaries and syncs unreported records to Polar.
func (t *UsageTracker) polarSyncer(ctx context.Context) {
	ticker := time.NewTicker(usagePolarSyncInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			t.aggregateSummaries()
			t.flushToPolar()
		}
	}
}

// aggregateSummaries rolls up usage_records into usage_summaries for the current billing period.
func (t *UsageTracker) aggregateSummaries() {
	now := time.Now().UTC()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0).Add(-time.Nanosecond)

	if err := t.db.AggregateUsageSummaries(periodStart, periodEnd); err != nil {
		t.logger.Error("Failed to aggregate usage summaries", "error", err)
	}
}

// polarAggKey groups usage records by workspace and dimension for Polar reporting.
type polarAggKey struct {
	WorkspaceID uint
	Dimension   db.UsageDimension
}

// resolveExternalID looks up the Polar external ID for a workspace, caching results.
// Returns empty string if the workspace has no Polar subscription.
func (t *UsageTracker) resolveExternalID(workspaceID uint, cache map[uint]string) string {
	if id, cached := cache[workspaceID]; cached {
		return id
	}
	sub, err := t.db.GetWorkspaceSubscription(workspaceID)
	if err != nil || sub.PolarExternalID == "" {
		cache[workspaceID] = ""
		return ""
	}
	cache[workspaceID] = sub.PolarExternalID
	return sub.PolarExternalID
}

// flushToPolar sends unreported usage records to Polar's metering API.
// Storage records are reported individually as gauge snapshots (for Polar Average aggregation).
// Other byte-based dimensions (data transfer) are aggregated per workspace before converting to GB.
// All byte-based dimensions report as fractional GB (float) so sub-GB usage is visible.
func (t *UsageTracker) flushToPolar() {
	records, err := t.db.GetUnreportedUsageRecords(usagePolarBatchLimit)
	if err != nil {
		t.logger.Error("Failed to get unreported usage records", "error", err)
		return
	}

	if len(records) == 0 {
		return
	}

	reportableIDs := make([]uint, 0, len(records))
	skippedIDs := make([]uint, 0)
	externalIDCache := make(map[uint]string)

	// Aggregate byte-based dimensions (excluding storage) per workspace so small records
	// (KB–MB) accumulate before GB conversion instead of rounding to 0.
	// Track record IDs per aggregation key so we only mark them reported
	// when the aggregation actually reaches a reportable GB threshold.
	byteAgg := make(map[polarAggKey]int64)
	byteRecordIDs := make(map[polarAggKey][]uint)
	events := make([]map[string]any, 0, len(records))

	for _, r := range records {
		externalID := t.resolveExternalID(r.WorkspaceID, externalIDCache)
		if externalID == "" {
			skippedIDs = append(skippedIDs, r.ID)
			continue
		}

		// Storage is a gauge — report each snapshot individually so Polar can compute the average.
		// Report as fractional GB so sub-GB usage is visible (e.g. 0.5 for 500 MB).
		if r.Dimension == db.UsageDimensionStorage {
			gbQuantity := float64(r.Quantity) / float64(db.BytesPerGB)
			events = append(events, map[string]any{
				"name":                 string(r.Dimension),
				"external_customer_id": externalID,
				"metadata":             map[string]any{"quantity": gbQuantity},
			})
			reportableIDs = append(reportableIDs, r.ID)
			continue
		}

		if db.IsByteDimension(r.Dimension) {
			key := polarAggKey{r.WorkspaceID, r.Dimension}
			byteAgg[key] += r.Quantity
			byteRecordIDs[key] = append(byteRecordIDs[key], r.ID)
			continue
		}

		reportableIDs = append(reportableIDs, r.ID)
		events = append(events, map[string]any{
			"name":                 string(r.Dimension),
			"external_customer_id": externalID,
			"metadata":             map[string]any{"quantity": r.Quantity},
		})
	}

	aggEvents, aggIDs := t.convertByteAggregations(byteAgg, byteRecordIDs, externalIDCache)
	events = append(events, aggEvents...)
	reportableIDs = append(reportableIDs, aggIDs...)

	// Mark records from workspaces without a Polar subscription as reported
	// so they don't accumulate and starve subscribed workspaces from sync.
	if len(skippedIDs) > 0 {
		reportableIDs = append(reportableIDs, skippedIDs...)
		t.logger.Warn("Skipped usage records without Polar customer ID", "count", len(skippedIDs))
	}

	if len(events) > 0 {
		if reportErr := t.billingService.ReportUsageBatch(events); reportErr != nil {
			t.logger.Error("Failed to report usage to Polar", "error", reportErr, "count", len(events))
			return
		}
	}

	if len(reportableIDs) > 0 {
		if markErr := t.db.MarkUsageRecordsReported(reportableIDs); markErr != nil {
			t.logger.Error("Failed to mark usage records as reported", "error", markErr, "count", len(reportableIDs))
		}
		t.logger.Info("Synced usage records to Polar", "reported", len(reportableIDs), "events", len(events))
	}
}

// convertByteAggregations converts aggregated byte totals to fractional GB events for Polar.
// Reports as float so sub-GB usage (e.g. 0.1 GB) is visible rather than rounding to 0.
func (t *UsageTracker) convertByteAggregations(
	byteAgg map[polarAggKey]int64,
	byteRecordIDs map[polarAggKey][]uint,
	externalIDCache map[uint]string,
) ([]map[string]any, []uint) {
	var events []map[string]any
	var reportableIDs []uint
	for key, totalBytes := range byteAgg {
		gbQuantity := float64(totalBytes) / float64(db.BytesPerGB)
		events = append(events, map[string]any{
			"name":                 string(key.Dimension),
			"external_customer_id": externalIDCache[key.WorkspaceID],
			"metadata":             map[string]any{"quantity": gbQuantity},
		})
		reportableIDs = append(reportableIDs, byteRecordIDs[key]...)
	}
	return events, reportableIDs
}

// storageReporter periodically measures actual storage from LakeFS for all workspaces.
func (t *UsageTracker) storageReporter(ctx context.Context) {
	ticker := time.NewTicker(storageReportInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			workspaces, err := t.db.GetAllWorkspaces()
			if err != nil {
				t.logger.ErrorContext(ctx, "Failed to get workspaces for storage reporting", "error", err)
				continue
			}
			for _, ws := range workspaces {
				t.trackWorkspaceStorage(ws.ID)
			}
		}
	}
}

// trackWorkspaceStorage measures total storage for a workspace and emits an absolute byte count.
// Prefers S3-level measurement (includes LakeFS metadata and all branches) when a LakeFS bucket
// client is available. Falls back to LakeFS API (default branch only) otherwise.
func (t *UsageTracker) trackWorkspaceStorage(workspaceID uint) {
	if t == nil {
		return
	}

	repos, err := t.db.GetRepositoriesInWorkspace(workspaceID)
	if err != nil {
		t.logger.Error("Failed to get repos for storage tracking", "error", err, "workspace_id", workspaceID)
		return
	}

	var totalBytes int64

	// Prefer S3-level measurement: lists actual objects in the LakeFS S3 bucket
	// which includes metadata files, all branches, and deduplication overhead.
	if t.lakefsBucket != nil {
		for _, repo := range repos {
			prefix := extractS3Prefix(repo.StorageNamespace)
			if prefix == "" {
				continue
			}
			size, sizeErr := t.lakefsBucket.TotalSize(context.Background(), prefix)
			if sizeErr != nil {
				t.logger.Error("Failed to measure S3 storage",
					"error", sizeErr, "workspace_id", workspaceID, "repo", repo.LakeFSRepoID)
				continue
			}
			totalBytes += size
		}
		t.Track(workspaceID, db.UsageDimensionStorage, totalBytes)
		return
	}

	// Fallback: use LakeFS API (only counts logical objects on default branch).
	if t.lakefsClient == nil {
		return
	}
	for _, repo := range repos {
		objects, listErr := t.lakefsClient.ListAllObjects(
			repo.LakeFSRepoID, repo.DefaultBranch,
			"", "", "", false, false,
		)
		if listErr != nil {
			t.logger.Error("Failed to list objects for storage",
				"error", listErr, "workspace_id", workspaceID, "repo", repo.LakeFSRepoID)
			continue
		}
		for _, obj := range objects {
			totalBytes += obj.SizeBytes
		}
	}
	t.Track(workspaceID, db.UsageDimensionStorage, totalBytes)
}

// extractS3Prefix strips the "s3://{bucket}/" prefix from a storage namespace,
// returning just the key prefix for S3 listing. The returned prefix always ends with "/"
// to prevent over-matching repos with overlapping name prefixes (e.g. "data" vs "data-pipeline").
// Returns empty string if the format is unexpected.
func extractS3Prefix(storageNamespace string) string {
	// StorageNamespace looks like "s3://bucket/workspace/repo/"
	trimmed := strings.TrimPrefix(storageNamespace, "s3://")
	if trimmed == storageNamespace {
		return "" // no s3:// prefix
	}
	// Skip the bucket name (first path segment)
	idx := strings.Index(trimmed, "/")
	if idx < 0 {
		return ""
	}
	prefix := trimmed[idx+1:]
	if !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}
	return prefix
}

// seatReporter periodically emits seat-count events for all workspaces.
func (t *UsageTracker) seatReporter(ctx context.Context) {
	ticker := time.NewTicker(seatReportInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			workspaces, err := t.db.GetAllWorkspaces()
			if err != nil {
				t.logger.ErrorContext(ctx, "Failed to get workspaces for seat reporting", "error", err)
				continue
			}
			for _, ws := range workspaces {
				t.TrackSeats(ws.ID)
			}
		}
	}
}

// eventToRecord converts an internal usage event to a database record.
func (t *UsageTracker) eventToRecord(evt usageEvent) *db.UsageRecord {
	// Use the beginning and end of the current month as the billing period
	now := evt.Timestamp
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0).Add(-time.Nanosecond)

	return &db.UsageRecord{
		WorkspaceID:     evt.WorkspaceID,
		Dimension:       evt.Dimension,
		Quantity:        evt.Quantity,
		PeriodStart:     periodStart,
		PeriodEnd:       periodEnd,
		ReportedToPolar: false,
	}
}
