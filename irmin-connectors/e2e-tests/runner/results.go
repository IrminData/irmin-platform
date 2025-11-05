package runner

import (
	"fmt"
	"os"
	"strings"
	"time"
)

const (
	percentageMultiplier = 100
	separatorWidth       = 80
)

// TestResult represents the result of a single test.
type TestResult struct {
	Name       string
	Connector  string
	Passed     bool
	Error      error
	Duration   time.Duration
	Skipped    bool
	SkipReason string
}

// TestSummary represents a summary of all test results.
type TestSummary struct {
	Results       []TestResult
	TotalTests    int
	PassedTests   int
	FailedTests   int
	SkippedTests  int
	TotalDuration time.Duration
	StartTime     time.Time
	EndTime       time.Time
}

// NewTestSummary creates a new test summary.
func NewTestSummary() *TestSummary {
	return &TestSummary{
		Results:   make([]TestResult, 0),
		StartTime: time.Now(),
	}
}

// AddResult adds a test result to the summary.
func (s *TestSummary) AddResult(result TestResult) {
	s.Results = append(s.Results, result)
	s.TotalTests++
	s.TotalDuration += result.Duration

	switch {
	case result.Skipped:
		s.SkippedTests++
	case result.Passed:
		s.PassedTests++
	default:
		s.FailedTests++
	}
}

// Finalize marks the end of testing.
func (s *TestSummary) Finalize() {
	s.EndTime = time.Now()
}

// Print outputs the test summary in a formatted way.
func (s *TestSummary) Print(verbose bool) {
	fmt.Fprintf(os.Stderr, "\n%s\n", strings.Repeat("=", separatorWidth))
	fmt.Fprintf(os.Stderr, "E2E CONNECTOR TEST SUMMARY\n")
	fmt.Fprintf(os.Stderr, "%s\n", strings.Repeat("=", separatorWidth))

	if verbose {
		fmt.Fprintf(os.Stderr, "\nDetailed Results:\n")
		fmt.Fprintf(os.Stderr, "%s\n", strings.Repeat("-", separatorWidth))

		for _, result := range s.Results {
			status := "✓ PASS"
			if result.Skipped {
				status = "⊘ SKIP"
			} else if !result.Passed {
				status = "✗ FAIL"
			}

			fmt.Fprintf(os.Stderr, "%s | %-20s | %-35s | %8s\n",
				status,
				result.Connector,
				result.Name,
				result.Duration.Round(time.Millisecond),
			)

			if result.Skipped && result.SkipReason != "" {
				fmt.Fprintf(os.Stderr, "      Reason: %s\n", result.SkipReason)
			}

			if result.Error != nil {
				fmt.Fprintf(os.Stderr, "      Error: %s\n", result.Error)
			}
		}
		fmt.Fprintf(os.Stderr, "%s\n", strings.Repeat("-", separatorWidth))
	}

	fmt.Fprintf(os.Stderr, "\nSummary:\n")
	fmt.Fprintf(os.Stderr, "  Total Tests:    %d\n", s.TotalTests)
	fmt.Fprintf(os.Stderr, "  Passed:         %d (%.1f%%)\n", s.PassedTests, s.percentage(s.PassedTests))
	fmt.Fprintf(os.Stderr, "  Failed:         %d (%.1f%%)\n", s.FailedTests, s.percentage(s.FailedTests))
	fmt.Fprintf(os.Stderr, "  Skipped:        %d (%.1f%%)\n", s.SkippedTests, s.percentage(s.SkippedTests))
	fmt.Fprintf(os.Stderr, "  Total Duration: %s\n", s.TotalDuration.Round(time.Millisecond))
	fmt.Fprintf(os.Stderr, "  Wall Time:      %s\n", s.EndTime.Sub(s.StartTime).Round(time.Millisecond))

	fmt.Fprintf(os.Stderr, "%s\n", strings.Repeat("=", separatorWidth))

	switch {
	case s.FailedTests > 0:
		fmt.Fprintf(os.Stderr, "\n❌ Some tests failed!\n")
	case s.TotalTests == s.SkippedTests:
		fmt.Fprintf(os.Stderr, "\n⊘ All tests were skipped\n")
	default:
		fmt.Fprintf(os.Stderr, "\n✅ All tests passed!\n")
	}
}

// percentage calculates the percentage of a value relative to total tests.
func (s *TestSummary) percentage(value int) float64 {
	if s.TotalTests == 0 {
		return 0
	}
	return float64(value) / float64(s.TotalTests) * percentageMultiplier
}

// HasFailures returns true if any tests failed.
func (s *TestSummary) HasFailures() bool {
	return s.FailedTests > 0
}

// GetFailedTests returns all failed test results.
func (s *TestSummary) GetFailedTests() []TestResult {
	failed := make([]TestResult, 0)
	for _, result := range s.Results {
		if !result.Passed && !result.Skipped {
			failed = append(failed, result)
		}
	}
	return failed
}
