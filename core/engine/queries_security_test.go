package engine_test

import (
	"context"
	"errors"
	"irmin-api/engine"
	"log/slog"
	"strings"
	"testing"

	"github.com/zeebo/assert"
)

// TestSanitizeQueryErrorRefined tests the refined sanitization logic.
func TestSanitizeQueryErrorRefined(t *testing.T) {
	testCases := []struct {
		name           string
		inputError     error
		expectedOutput string
		shouldLog      bool
	}{
		{
			name:           "Table not found error is preserved (not sanitized)",
			inputError:     errors.New("Table 'mytable' not found"),
			expectedOutput: "Table 'mytable' not found",
			shouldLog:      false,
		},
		{
			name:           "Column not found error is preserved (not sanitized)",
			inputError:     errors.New("Column 'col' not found"),
			expectedOutput: "Column 'col' not found",
			shouldLog:      false,
		},
		{
			name:           "404 error is still sanitized",
			inputError:     errors.New("HTTP Error: 404 Not Found"),
			expectedOutput: "access denied",
			shouldLog:      true,
		},
		{
			name:           "S3 error is still sanitized",
			inputError:     errors.New("Error reading s3://bucket/file"),
			expectedOutput: "access denied",
			shouldLog:      true,
		},
		{
			name:           "LakeFS error is still sanitized",
			inputError:     errors.New("LakeFS error: invalid credentials"),
			expectedOutput: "access denied",
			shouldLog:      true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var logOutput strings.Builder
			logger := slog.New(slog.NewTextHandler(&logOutput, &slog.HandlerOptions{
				Level: slog.LevelWarn,
			}))
			ctx := context.Background()

			result := engine.SanitizeQueryError(tc.inputError, logger, ctx)

			if tc.inputError == nil {
				assert.Nil(t, result)
			} else {
				assert.NotNil(t, result)
				assert.Equal(t, tc.expectedOutput, result.Error())

				loggedOutput := logOutput.String()
				if tc.shouldLog {
					assert.True(t, strings.Contains(loggedOutput, "Query error sanitized for user"))
				} else {
					assert.False(t, strings.Contains(loggedOutput, "Query error sanitized"))
				}
			}
		})
	}
}

// TestValidateQuerySecurityBypass tests against split S3 protocol bypasses.
func TestValidateQuerySecurityBypass(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		shouldError bool
	}{
		{
			name:        "CONCAT with split S3 protocol is blocked",
			query:       "SELECT * FROM read_json(CONCAT('s3', '://', 'bucket/file.json'))",
			shouldError: true,
		},
		{
			name:        "CONCAT with split S3 protocol mixed case is blocked",
			query:       "SELECT * FROM read_json(CONCAT('S3', '://', 'bucket/file.json'))",
			shouldError: true,
		},
		{
			name:        "Pipe concatenation with split S3 protocol is blocked",
			query:       "SELECT 's3' || '://' || 'bucket/file'",
			shouldError: true,
		},
		{
			name:        "Split S3 protocol with spaces is blocked",
			query:       "SELECT 's3'  ||  '://'",
			shouldError: true,
		},
		{
			name:        "Safe CONCAT usage is allowed",
			query:       "SELECT CONCAT('hello', 'world')",
			shouldError: false,
		},
		{
			name:        "Safe pipe usage is allowed",
			query:       "SELECT 'a' || 'b'",
			shouldError: false,
		},
		{
			name:        "S3 in string literal without protocol is allowed",
			query:       "SELECT 's3_bucket_name'",
			shouldError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := engine.ValidateQuerySecurity(tt.query)
			if tt.shouldError {
				assert.NotNil(t, err)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

// TestValidateQuerySecurity_CommentBypass tests for comment stripping bypass vulnerabilities.
func TestValidateQuerySecurity_CommentBypass(t *testing.T) {
	// specific test case from the issue description
	// "SELECT '/*'; ATTACH DATABASE 'x'; SELECT '*/';"
	// This should be blocked because it contains ATTACH, but the comment removal
	// might strip it out if it doesn't respect string literals.

	query := "SELECT '/*'; ATTACH DATABASE 'x'; SELECT '*/';"
	err := engine.ValidateQuerySecurity(query)
	assert.Error(t, err)
	assert.Equal(t, "access denied", err.Error())
}

// TestValidateQuerySecurity_StringLiteralFalsePositives tests that blacklisted keywords
// inside string literals are not incorrectly blocked.
func TestValidateQuerySecurity_StringLiteralFalsePositives(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		shouldError bool
		description string
	}{
		{
			name:        "LOAD keyword in string literal should be allowed",
			query:       "SELECT * FROM data WHERE status = 'LOAD'",
			shouldError: false,
			description: "LOAD appears as a data value, not a SQL command",
		},
		{
			name:        "ATTACH keyword in string literal should be allowed",
			query:       "SELECT * FROM data WHERE action = 'ATTACH'",
			shouldError: false,
			description: "ATTACH appears as a data value, not a SQL command",
		},
		{
			name:        "INSTALL keyword in string literal should be allowed",
			query:       "SELECT * FROM packages WHERE name = 'INSTALL'",
			shouldError: false,
			description: "INSTALL appears as a data value, not a SQL command",
		},
		{
			name:        "CREATE SECRET in string literal should be allowed",
			query:       "SELECT * FROM logs WHERE message = 'CREATE SECRET'",
			shouldError: false,
			description: "CREATE SECRET appears as a data value, not a SQL command",
		},
		{
			name:        "Multiple keywords in string literals should be allowed",
			query:       "SELECT * FROM data WHERE status IN ('LOAD', 'ATTACH', 'INSTALL')",
			shouldError: false,
			description: "Multiple blacklisted keywords as data values should be allowed",
		},
		{
			name:        "Double-quoted string with LOAD should be allowed",
			query:       `SELECT * FROM data WHERE status = "LOAD"`,
			shouldError: false,
			description: "LOAD in double-quoted string literal should be allowed",
		},
		{
			name:        "Escaped quotes in string with LOAD should be allowed",
			query:       "SELECT * FROM data WHERE status = 'LOAD''s status'",
			shouldError: false,
			description: "LOAD in string with escaped quotes should be allowed",
		},
		{
			name:        "Actual LOAD command should still be blocked",
			query:       "LOAD 'extension'",
			shouldError: true,
			description: "Actual LOAD command should be blocked",
		},
		{
			name:        "Actual ATTACH command should still be blocked",
			query:       "ATTACH DATABASE 'test.db'",
			shouldError: true,
			description: "Actual ATTACH command should be blocked",
		},
		{
			name:        "Actual INSTALL command should still be blocked",
			query:       "INSTALL 'extension'",
			shouldError: true,
			description: "Actual INSTALL command should be blocked",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := engine.ValidateQuerySecurity(tt.query)
			if tt.shouldError {
				assert.NotNil(t, err)
				if err != nil {
					assert.Equal(t, "access denied", err.Error())
				}
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
