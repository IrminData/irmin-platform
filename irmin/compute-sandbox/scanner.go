package sandbox

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

// DangerousPattern represents a pattern that might indicate malicious intent.
type DangerousPattern struct {
	Pattern     string
	Description string
	Severity    string // "high", "medium", "low"
}

// scanScriptForDangerousPatterns performs static analysis on the script.
func (e *executor) scanScriptForDangerousPatterns(ctx context.Context, scriptPath string) error {
	// Pattern list is static and used across all executions
	dangerousPatterns := []DangerousPattern{
		{Pattern: "/app", Description: "Accessing application directory", Severity: "high"},
		{Pattern: "/etc/passwd", Description: "Accessing system password file", Severity: "high"},
		{Pattern: "/etc/shadow", Description: "Accessing system shadow file", Severity: "high"},
		{Pattern: "../", Description: "Directory traversal attempt", Severity: "high"},
		{Pattern: "/proc/", Description: "Accessing process information", Severity: "medium"},
		{Pattern: "/sys/", Description: "Accessing system information", Severity: "medium"},
		{Pattern: "$HOME", Description: "Home directory access", Severity: "medium"},
		{Pattern: "os.environ", Description: "Environment variable access (Python)", Severity: "medium"},
		{Pattern: "process.env", Description: "Environment variable access (Node)", Severity: "medium"},
		{Pattern: "os.Getenv", Description: "Environment variable access (Go)", Severity: "medium"},
	}

	// Read the script file
	content, err := os.ReadFile(scriptPath)
	if err != nil {
		return err
	}

	scriptContent := string(content)
	detectedPatterns := []DangerousPattern{}

	for _, dp := range dangerousPatterns {
		if strings.Contains(scriptContent, dp.Pattern) {
			detectedPatterns = append(detectedPatterns, dp)
		}
	}

	if len(detectedPatterns) > 0 {
		for _, dp := range detectedPatterns {
			e.sandbox.logger.WarnContext(ctx, "SECURITY_ALERT: Dangerous pattern",
				"pattern", dp.Pattern,
				"description", dp.Description,
				"severity", dp.Severity,
				"script", filepath.Base(scriptPath))
		}
	}

	return nil
}
