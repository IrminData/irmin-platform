package sftpclient

import (
	"sync"
	"time"
)

const (
	// PercentageMultiplier is used to convert rate to percentage.
	PercentageMultiplier = 100
)

// OperationMetrics tracks metrics for SFTP operations.
type OperationMetrics struct {
	Operation        string        `json:"operation"`
	StartTime        time.Time     `json:"start_time"`
	Duration         time.Duration `json:"duration"`
	BytesTransferred int64         `json:"bytes_transferred"`
	FilesProcessed   int           `json:"files_processed"`
	Success          bool          `json:"success"`
	ErrorMessage     string        `json:"error_message,omitempty"`
	RetryCount       int           `json:"retry_count"`
}

// MetricsCollector collects and aggregates SFTP operation metrics.
type MetricsCollector struct {
	mutex      sync.RWMutex
	operations []OperationMetrics
	summary    OperationSummary
}

// OperationSummary provides aggregated statistics.
type OperationSummary struct {
	TotalOperations       int           `json:"total_operations"`
	SuccessfulOps         int           `json:"successful_operations"`
	FailedOps             int           `json:"failed_operations"`
	TotalBytesTransferred int64         `json:"total_bytes_transferred"`
	TotalFilesProcessed   int           `json:"total_files_processed"`
	AverageDuration       time.Duration `json:"average_duration"`
	TotalRetries          int           `json:"total_retries"`
	SuccessRate           float64       `json:"success_rate"`
}

// NewMetricsCollector creates a new metrics collector.
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		operations: make([]OperationMetrics, 0),
		summary:    OperationSummary{},
	}
}

// RecordOperation records metrics for a completed operation.
func (mc *MetricsCollector) RecordOperation(metrics OperationMetrics) {
	mc.mutex.Lock()
	defer mc.mutex.Unlock()

	mc.operations = append(mc.operations, metrics)
	mc.updateSummary(metrics)
}

// updateSummary updates the aggregated summary statistics.
func (mc *MetricsCollector) updateSummary(metrics OperationMetrics) {
	mc.summary.TotalOperations++

	if metrics.Success {
		mc.summary.SuccessfulOps++
	} else {
		mc.summary.FailedOps++
	}

	mc.summary.TotalBytesTransferred += metrics.BytesTransferred
	mc.summary.TotalFilesProcessed += metrics.FilesProcessed
	mc.summary.TotalRetries += metrics.RetryCount

	// Calculate average duration
	totalDuration := time.Duration(0)
	for _, op := range mc.operations {
		totalDuration += op.Duration
	}
	mc.summary.AverageDuration = totalDuration / time.Duration(len(mc.operations))

	// Calculate success rate
	if mc.summary.TotalOperations > 0 {
		mc.summary.SuccessRate = float64(
			mc.summary.SuccessfulOps,
		) / float64(
			mc.summary.TotalOperations,
		) * PercentageMultiplier
	}
}

// GetSummary returns the current operation summary.
func (mc *MetricsCollector) GetSummary() OperationSummary {
	mc.mutex.RLock()
	defer mc.mutex.RUnlock()
	return mc.summary
}

// GetRecentOperations returns the most recent operations.
func (mc *MetricsCollector) GetRecentOperations(limit int) []OperationMetrics {
	mc.mutex.RLock()
	defer mc.mutex.RUnlock()

	if limit <= 0 || limit > len(mc.operations) {
		limit = len(mc.operations)
	}

	start := len(mc.operations) - limit
	if start < 0 {
		start = 0
	}

	recent := make([]OperationMetrics, limit)
	copy(recent, mc.operations[start:])
	return recent
}

// ClearMetrics clears all collected metrics.
func (mc *MetricsCollector) ClearMetrics() {
	mc.mutex.Lock()
	defer mc.mutex.Unlock()

	mc.operations = make([]OperationMetrics, 0)
	mc.summary = OperationSummary{}
}

// PerformanceTracker tracks performance for individual operations.
type PerformanceTracker struct {
	operation        string
	startTime        time.Time
	bytesTransferred int64
	filesProcessed   int
	retryCount       int
	collector        *MetricsCollector
}

// NewPerformanceTracker creates a new performance tracker.
func NewPerformanceTracker(operation string, collector *MetricsCollector) *PerformanceTracker {
	return &PerformanceTracker{
		operation: operation,
		startTime: time.Now(),
		collector: collector,
	}
}

// AddBytes adds to the bytes transferred count.
func (pt *PerformanceTracker) AddBytes(bytes int64) {
	pt.bytesTransferred += bytes
}

// AddFiles adds to the files processed count.
func (pt *PerformanceTracker) AddFiles(count int) {
	pt.filesProcessed += count
}

// AddRetry increments the retry count.
func (pt *PerformanceTracker) AddRetry() {
	pt.retryCount++
}

// Finish completes the tracking and records the metrics.
func (pt *PerformanceTracker) Finish(success bool, errorMessage string) {
	duration := time.Since(pt.startTime)

	metrics := OperationMetrics{
		Operation:        pt.operation,
		StartTime:        pt.startTime,
		Duration:         duration,
		BytesTransferred: pt.bytesTransferred,
		FilesProcessed:   pt.filesProcessed,
		Success:          success,
		ErrorMessage:     errorMessage,
		RetryCount:       pt.retryCount,
	}

	if pt.collector != nil {
		pt.collector.RecordOperation(metrics)
	}
}

// TransferSpeedCalculator calculates transfer speeds.
type TransferSpeedCalculator struct {
	startTime  time.Time
	totalBytes int64
}

// NewTransferSpeedCalculator creates a new speed calculator.
func NewTransferSpeedCalculator() *TransferSpeedCalculator {
	return &TransferSpeedCalculator{
		startTime: time.Now(),
	}
}

// AddBytes adds bytes to the transfer count.
func (tsc *TransferSpeedCalculator) AddBytes(bytes int64) {
	tsc.totalBytes += bytes
}

// GetCurrentSpeed returns the current transfer speed in bytes per second.
func (tsc *TransferSpeedCalculator) GetCurrentSpeed() float64 {
	duration := time.Since(tsc.startTime)
	if duration.Seconds() == 0 {
		return 0
	}
	return float64(tsc.totalBytes) / duration.Seconds()
}

// GetAverageSpeed returns the average transfer speed over the entire duration.
func (tsc *TransferSpeedCalculator) GetAverageSpeed() float64 {
	return tsc.GetCurrentSpeed()
}

// GetFormattedSpeed returns the current speed in human-readable format.
func (tsc *TransferSpeedCalculator) GetFormattedSpeed() string {
	speed := tsc.GetCurrentSpeed()
	return FormatFileSize(int64(speed)) + "/s"
}

// GetTotalBytes returns the total bytes transferred.
func (tsc *TransferSpeedCalculator) GetTotalBytes() int64 {
	return tsc.totalBytes
}

// GetElapsedTime returns the elapsed time since tracking started.
func (tsc *TransferSpeedCalculator) GetElapsedTime() time.Duration {
	return time.Since(tsc.startTime)
}
