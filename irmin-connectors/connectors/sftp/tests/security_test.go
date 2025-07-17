package sftptests_test

import (
	sftpclient "irmin-connectors/connectors/sftp/client"
	"testing"
	"time"
)

// TestSecurityConfig tests the security configuration.
func TestSecurityConfig(t *testing.T) {
	config := sftpclient.DefaultSecurityConfig()

	// Test valid path
	err := config.ValidatePath("/valid/path/file.txt")
	if err != nil {
		t.Errorf("Expected valid path to pass validation, got error: %v", err)
	}

	// Test path traversal attack
	err = config.ValidatePath("/valid/../../../etc/passwd")
	if err == nil {
		t.Error("Expected path traversal to be rejected")
	}

	// Test null byte attack
	err = config.ValidatePath("/valid/path\x00.txt")
	if err == nil {
		t.Error("Expected null byte to be rejected")
	}

	// Test path too long
	longPath := "/" + string(make([]byte, config.MaxPathLength))
	err = config.ValidatePath(longPath)
	if err == nil {
		t.Error("Expected long path to be rejected")
	}
}

// TestFilenameValidation tests filename validation.
func TestFilenameValidation(t *testing.T) {
	config := sftpclient.DefaultSecurityConfig()

	// Test valid filename
	err := config.ValidateFileName("valid_file.txt")
	if err != nil {
		t.Errorf("Expected valid filename to pass validation, got error: %v", err)
	}

	// Test blocked extension
	err = config.ValidateFileName("malware.exe")
	if err == nil {
		t.Error("Expected blocked extension to be rejected")
	}

	// Test forbidden filename
	err = config.ValidateFileName("CON")
	if err == nil {
		t.Error("Expected forbidden filename to be rejected")
	}

	// Test invalid character
	err = config.ValidateFileName("file<test>.txt")
	if err == nil {
		t.Error("Expected invalid character to be rejected")
	}
}

// TestFileSizeValidation tests file size validation.
func TestFileSizeValidation(t *testing.T) {
	config := sftpclient.DefaultSecurityConfig()

	// Test valid file size
	err := config.ValidateFileSize(1024 * 1024) // 1MB
	if err != nil {
		t.Errorf("Expected valid file size to pass validation, got error: %v", err)
	}

	// Test oversized file
	err = config.ValidateFileSize(config.MaxFileSize + 1)
	if err == nil {
		t.Error("Expected oversized file to be rejected")
	}

	// Test negative file size
	err = config.ValidateFileSize(-1)
	if err == nil {
		t.Error("Expected negative file size to be rejected")
	}
}

// TestTransferSizeValidation tests transfer size validation.
func TestTransferSizeValidation(t *testing.T) {
	config := sftpclient.DefaultSecurityConfig()

	// Test valid transfer
	err := config.ValidateTransferSize(1024*1024*100, 10) // 100MB, 10 files
	if err != nil {
		t.Errorf("Expected valid transfer to pass validation, got error: %v", err)
	}

	// Test oversized transfer
	err = config.ValidateTransferSize(config.MaxTotalSize+1, 1)
	if err == nil {
		t.Error("Expected oversized transfer to be rejected")
	}

	// Test too many files
	err = config.ValidateTransferSize(1024, config.MaxFilesPerTransfer+1)
	if err == nil {
		t.Error("Expected too many files to be rejected")
	}
}

// TestPathSanitization tests path sanitization.
func TestPathSanitization(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"/normal/path", "/normal/path"},
		{"relative/path", "/relative/path"},
		{"/path/../safe", "/safe"},
		{"/path/./current", "/path/current"},
		{"", "/"},
		{"/path//double//slash", "/path/double/slash"},
	}

	for _, test := range tests {
		result := sftpclient.SanitizePath(test.input)
		if result != test.expected {
			t.Errorf("SanitizePath(%q) = %q, expected %q", test.input, result, test.expected)
		}
	}
}

// TestIsTextFile tests text file detection.
func TestIsTextFile(t *testing.T) {
	tests := []struct {
		filename string
		expected bool
	}{
		{"document.txt", true},
		{"config.json", true},
		{"script.js", true},
		{"image.jpg", false},
		{"binary.exe", false},
		{"data.csv", true},
		{"readme.md", true},
		{"noextension", false},
	}

	for _, test := range tests {
		result := sftpclient.IsTextFile(test.filename)
		if result != test.expected {
			t.Errorf("IsTextFile(%q) = %v, expected %v", test.filename, result, test.expected)
		}
	}
}

// TestFormatFileSize tests file size formatting.
func TestFormatFileSize(t *testing.T) {
	tests := []struct {
		bytes    int64
		expected string
	}{
		{512, "512 B"},
		{1024, "1.0 KB"},
		{1536, "1.5 KB"},
		{1024 * 1024, "1.0 MB"},
		{1024 * 1024 * 1024, "1.0 GB"},
	}

	for _, test := range tests {
		result := sftpclient.FormatFileSize(test.bytes)
		if result != test.expected {
			t.Errorf("FormatFileSize(%d) = %q, expected %q", test.bytes, result, test.expected)
		}
	}
}

// TestMetricsCollector tests the metrics collection functionality.
func TestMetricsCollector(t *testing.T) {
	collector := sftpclient.NewMetricsCollector()

	// Test initial state
	summary := collector.GetSummary()
	if summary.TotalOperations != 0 {
		t.Error("Expected initial total operations to be 0")
	}

	// Record successful operation
	metrics1 := sftpclient.OperationMetrics{
		Operation:        "test_upload",
		StartTime:        time.Now(),
		Duration:         2 * time.Second,
		BytesTransferred: 1024,
		FilesProcessed:   1,
		Success:          true,
		RetryCount:       0,
	}
	collector.RecordOperation(metrics1)

	// Record failed operation
	metrics2 := sftpclient.OperationMetrics{
		Operation:        "test_download",
		StartTime:        time.Now(),
		Duration:         1 * time.Second,
		BytesTransferred: 0,
		FilesProcessed:   0,
		Success:          false,
		ErrorMessage:     "Connection failed",
		RetryCount:       2,
	}
	collector.RecordOperation(metrics2)

	// Verify summary
	summary = collector.GetSummary()
	if summary.TotalOperations != 2 {
		t.Errorf("Expected 2 total operations, got %d", summary.TotalOperations)
	}
	if summary.SuccessfulOps != 1 {
		t.Errorf("Expected 1 successful operation, got %d", summary.SuccessfulOps)
	}
	if summary.FailedOps != 1 {
		t.Errorf("Expected 1 failed operation, got %d", summary.FailedOps)
	}
	if summary.SuccessRate != 50.0 {
		t.Errorf("Expected 50%% success rate, got %f", summary.SuccessRate)
	}
	if summary.TotalBytesTransferred != 1024 {
		t.Errorf("Expected 1024 bytes transferred, got %d", summary.TotalBytesTransferred)
	}
	if summary.TotalRetries != 2 {
		t.Errorf("Expected 2 total retries, got %d", summary.TotalRetries)
	}

	// Test recent operations
	recent := collector.GetRecentOperations(1)
	if len(recent) != 1 {
		t.Errorf("Expected 1 recent operation, got %d", len(recent))
	}
	if recent[0].Operation != "test_download" {
		t.Errorf("Expected most recent operation to be test_download, got %s", recent[0].Operation)
	}
}

// TestPerformanceTracker tests the performance tracking functionality.
func TestPerformanceTracker(t *testing.T) {
	collector := sftpclient.NewMetricsCollector()
	tracker := sftpclient.NewPerformanceTracker("test_operation", collector)

	// Simulate operation
	tracker.AddBytes(2048)
	tracker.AddFiles(2)
	tracker.AddRetry()

	// Finish tracking
	tracker.Finish(true, "")

	// Verify metrics were recorded
	summary := collector.GetSummary()
	if summary.TotalOperations != 1 {
		t.Errorf("Expected 1 total operation, got %d", summary.TotalOperations)
	}
	if summary.TotalBytesTransferred != 2048 {
		t.Errorf("Expected 2048 bytes transferred, got %d", summary.TotalBytesTransferred)
	}
	if summary.TotalFilesProcessed != 2 {
		t.Errorf("Expected 2 files processed, got %d", summary.TotalFilesProcessed)
	}
	if summary.TotalRetries != 1 {
		t.Errorf("Expected 1 retry, got %d", summary.TotalRetries)
	}
}

// TestTransferSpeedCalculator tests the transfer speed calculation.
func TestTransferSpeedCalculator(t *testing.T) {
	calculator := sftpclient.NewTransferSpeedCalculator()

	// Add some bytes
	calculator.AddBytes(1024)

	// Wait a bit to get meaningful speed calculation
	time.Sleep(10 * time.Millisecond)

	calculator.AddBytes(1024)

	// Test speed calculation
	speed := calculator.GetCurrentSpeed()
	if speed <= 0 {
		t.Error("Expected positive transfer speed")
	}

	totalBytes := calculator.GetTotalBytes()
	if totalBytes != 2048 {
		t.Errorf("Expected 2048 total bytes, got %d", totalBytes)
	}

	formattedSpeed := calculator.GetFormattedSpeed()
	if formattedSpeed == "" {
		t.Error("Expected formatted speed string")
	}

	elapsed := calculator.GetElapsedTime()
	if elapsed <= 0 {
		t.Error("Expected positive elapsed time")
	}
}

// TestRetryConfig tests retry configuration.
func TestRetryConfig(t *testing.T) {
	config := sftpclient.DefaultRetryConfig()

	if config.MaxRetries <= 0 {
		t.Error("Expected positive max retries")
	}
	if config.InitialDelay <= 0 {
		t.Error("Expected positive initial delay")
	}
	if config.BackoffFactor <= 1.0 {
		t.Error("Expected backoff factor greater than 1.0")
	}
	if len(config.RetryableErrors) == 0 {
		t.Error("Expected at least one retryable error pattern")
	}
}

// BenchmarkSanitizePath benchmarks path sanitization performance.
func BenchmarkSanitizePath(b *testing.B) {
	testPath := "/some/path/../with/traversal/attempts"

	for range b.N {
		sftpclient.SanitizePath(testPath)
	}
}

// BenchmarkValidatePath benchmarks path validation performance.
func BenchmarkValidatePath(b *testing.B) {
	config := sftpclient.DefaultSecurityConfig()
	testPath := "/valid/test/path/file.txt"

	for range b.N {
		config.ValidatePath(testPath)
	}
}
