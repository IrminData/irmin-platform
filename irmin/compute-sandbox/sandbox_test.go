package sandbox_test

import (
	"context"
	"strings"
	"testing"
	"time"

	sandbox "irmin-api/compute-sandbox"

	"github.com/zeebo/assert"
)

// --- determineExecutableTypeAndFileName ---

func TestDetermineExecutableTypeAndFileName(t *testing.T) {
	s := sandbox.NewTestSandbox()

	tests := []struct {
		name             string
		language         string
		expectedType     string
		expectedFileName string
		expectError      bool
	}{
		{
			name: "python lowercase", language: "python",
			expectedType: sandbox.RuntimeTypePython, expectedFileName: "script.py",
		},
		{
			name: "py shorthand", language: "py",
			expectedType: sandbox.RuntimeTypePython, expectedFileName: "script.py",
		},
		{
			name: "Python mixed case", language: "Python",
			expectedType: sandbox.RuntimeTypePython, expectedFileName: "script.py",
		},
		{
			name: "python with whitespace", language: "  python  ",
			expectedType: sandbox.RuntimeTypePython, expectedFileName: "script.py",
		},
		{
			name: "go lowercase", language: "go",
			expectedType: sandbox.RuntimeTypeGo, expectedFileName: "main.go",
		},
		{
			name: "golang alias", language: "golang",
			expectedType: sandbox.RuntimeTypeGo, expectedFileName: "main.go",
		},
		{
			name: "javascript", language: "javascript",
			expectedType: sandbox.RuntimeTypeNode, expectedFileName: "script.js",
		},
		{
			name: "js shorthand", language: "js",
			expectedType: sandbox.RuntimeTypeNode, expectedFileName: "script.js",
		},
		{
			name: "typescript", language: "typescript",
			expectedType: sandbox.RuntimeTypeNode, expectedFileName: "script.ts",
		},
		{
			name: "ts shorthand", language: "ts",
			expectedType: sandbox.RuntimeTypeNode, expectedFileName: "script.ts",
		},
		{
			name: "node", language: "node",
			expectedType: sandbox.RuntimeTypeNode, expectedFileName: "script.js",
		},
		{
			name: "nodejs", language: "nodejs",
			expectedType: sandbox.RuntimeTypeNode, expectedFileName: "script.js",
		},
		{name: "unsupported language", language: "ruby", expectError: true},
		{name: "empty string", language: "", expectError: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			runtimeType, fileName, err := s.TestDetermineExecutableTypeAndFileName(tt.language)
			if tt.expectError {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedType, runtimeType)
			assert.Equal(t, tt.expectedFileName, fileName)
		})
	}
}

// --- buildExecutionCommand ---

func TestBuildExecutionCommand(t *testing.T) {
	s := sandbox.NewTestSandbox()

	tests := []struct {
		name           string
		runtimeType    string
		scriptFileName string
		apiKey         string
		apiURL         string
		wantPrefix     string
	}{
		{
			name:           "go runtime",
			runtimeType:    sandbox.RuntimeTypeGo,
			scriptFileName: "main.go",
			apiKey:         "test-key",
			apiURL:         "http://localhost:8080/api",
			wantPrefix:     "sh -c 'go run main.go",
		},
		{
			name:           "python runtime",
			runtimeType:    sandbox.RuntimeTypePython,
			scriptFileName: "script.py",
			apiKey:         "test-key",
			apiURL:         "http://localhost:8080/api",
			wantPrefix:     "sh -c 'python3 script.py",
		},
		{
			name:           "node runtime",
			runtimeType:    sandbox.RuntimeTypeNode,
			scriptFileName: "script.js",
			apiKey:         "test-key",
			apiURL:         "http://localhost:8080/api",
			wantPrefix:     "sh -c 'node script.js",
		},
		{
			name:           "unknown runtime falls back to direct execution",
			runtimeType:    "unknown",
			scriptFileName: "script.sh",
			apiKey:         "test-key",
			apiURL:         "http://localhost:8080/api",
			wantPrefix:     "sh -c './script.sh",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := s.TestBuildExecutionCommand(
				tt.runtimeType, tt.scriptFileName, tt.apiKey, tt.apiURL,
			)
			assert.True(t, strings.HasPrefix(cmd, tt.wantPrefix))
			assert.True(t, strings.Contains(cmd, "--api-key"))
			assert.True(t, strings.Contains(cmd, "--api-url"))
			assert.True(t, strings.Contains(cmd, tt.apiKey))
			assert.True(t, strings.Contains(cmd, tt.apiURL))
		})
	}
}

func TestBuildExecutionCommandQuotesSpecialChars(t *testing.T) {
	s := sandbox.NewTestSandbox()
	cmd := s.TestBuildExecutionCommand(
		sandbox.RuntimeTypePython, "script.py",
		"key with spaces", "http://example.com/a&b",
	)
	// %q in fmt.Sprintf wraps values in Go-style double quotes
	assert.True(t, strings.Contains(cmd, `"key with spaces"`))
	assert.True(t, strings.Contains(cmd, `"http://example.com/a&b"`))
}

// --- buildScriptLockKey ---

func TestBuildScriptLockKey(t *testing.T) {
	s := sandbox.NewTestSandbox()

	assert.Equal(t, "script:id:1", s.TestBuildScriptLockKey(1))
	assert.Equal(t, "script:id:42", s.TestBuildScriptLockKey(42))
	assert.Equal(t, "script:id:0", s.TestBuildScriptLockKey(0))
}

// --- dockerImageForRuntime ---

func TestDockerImageForRuntime(t *testing.T) {
	tests := []struct {
		name        string
		runtimeType string
		wantImage   string
		expectError bool
	}{
		{name: "go", runtimeType: sandbox.RuntimeTypeGo, wantImage: sandbox.DockerImageGo},
		{name: "python", runtimeType: sandbox.RuntimeTypePython, wantImage: sandbox.DockerImagePython},
		{name: "node", runtimeType: sandbox.RuntimeTypeNode, wantImage: sandbox.DockerImageNode},
		{name: "unsupported", runtimeType: "ruby", expectError: true},
		{name: "empty", runtimeType: "", expectError: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			image, err := sandbox.ExportDockerImageForRuntime(tt.runtimeType)
			if tt.expectError {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.wantImage, image)
		})
	}
}

// --- parseResultFiles ---

func TestParseResultFiles(t *testing.T) {
	s := sandbox.NewTestSandbox()

	tests := []struct {
		name     string
		logs     string
		expected []string
	}{
		{
			name:     "single result file",
			logs:     "some output\n<RESULT_FILE_WRITTEN>output.csv</RESULT_FILE_WRITTEN>\ndone",
			expected: []string{"output.csv"},
		},
		{
			name: "multiple result files",
			logs: "<RESULT_FILE_WRITTEN>a.csv</RESULT_FILE_WRITTEN>\n" +
				"<RESULT_FILE_WRITTEN>b.json</RESULT_FILE_WRITTEN>",
			expected: []string{"a.csv", "b.json"},
		},
		{
			name:     "no tags",
			logs:     "just regular output with no tags",
			expected: nil,
		},
		{
			name:     "empty logs",
			logs:     "",
			expected: nil,
		},
		{
			name:     "malformed tag missing end",
			logs:     "<RESULT_FILE_WRITTEN>output.csv",
			expected: nil,
		},
		{
			name:     "empty file name in tag is skipped",
			logs:     "<RESULT_FILE_WRITTEN></RESULT_FILE_WRITTEN>",
			expected: nil,
		},
		{
			name:     "file with subdirectory path",
			logs:     "<RESULT_FILE_WRITTEN>results/output.csv</RESULT_FILE_WRITTEN>",
			expected: []string{"results/output.csv"},
		},
		{
			name: "tags with surrounding text",
			logs: "Processing...\nStep 1 done\n" +
				"<RESULT_FILE_WRITTEN>result.parquet</RESULT_FILE_WRITTEN>\n" +
				"Step 2 done\n" +
				"<RESULT_FILE_WRITTEN>summary.json</RESULT_FILE_WRITTEN>\nAll done!",
			expected: []string{"result.parquet", "summary.json"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := s.TestParseResultFiles(tt.logs)
			if tt.expected == nil {
				assert.Equal(t, 0, len(result))
				return
			}
			assert.Equal(t, len(tt.expected), len(result))
			for i, expected := range tt.expected {
				assert.Equal(t, expected, result[i])
			}
		})
	}
}

// --- scanScriptContent ---

func TestScanScriptContentDoesNotPanic(t *testing.T) {
	s := sandbox.NewTestSandbox()
	ctx := context.Background()

	// Should not panic on any input
	s.TestScanScriptContent(ctx, "", "test.py")
	s.TestScanScriptContent(ctx, "print('hello world')", "test.py")
	s.TestScanScriptContent(ctx, "import os; os.environ['PATH']", "test.py")
	s.TestScanScriptContent(
		ctx,
		"open('/etc/passwd').read()\nos.environ\n../../../etc/shadow",
		"test.py",
	)
}

func TestScanScriptContentDetectsPatterns(t *testing.T) {
	var buf strings.Builder
	s := sandbox.NewTestSandboxWithLogBuffer(&buf)
	ctx := context.Background()

	s.TestScanScriptContent(ctx, "data = open('/etc/passwd').read()", "test.py")
	assert.True(t, strings.Contains(buf.String(), "SECURITY_ALERT"))
	assert.True(t, strings.Contains(buf.String(), "/etc/passwd"))
}

func TestScanScriptContentCleanScript(t *testing.T) {
	var buf strings.Builder
	s := sandbox.NewTestSandboxWithLogBuffer(&buf)
	ctx := context.Background()

	s.TestScanScriptContent(ctx, "print('hello world')\nx = 1 + 2", "test.py")
	assert.Equal(t, "", buf.String())
}

// --- formatLogsWithTiming ---

func TestFormatLogsWithTiming(t *testing.T) {
	s := sandbox.NewTestSandbox()
	start := time.Date(2025, 1, 15, 10, 0, 0, 0, time.UTC)
	end := time.Date(2025, 1, 15, 10, 0, 5, 0, time.UTC)

	result := s.TestFormatLogsWithTiming(start, end, "script output here")

	assert.True(t, strings.Contains(result, "=== Script Execution Report ==="))
	assert.True(t, strings.Contains(result, "2025-01-15T10:00:00Z"))
	assert.True(t, strings.Contains(result, "2025-01-15T10:00:05Z"))
	assert.True(t, strings.Contains(result, "5s"))
	assert.True(t, strings.Contains(result, "5000"))
	assert.True(t, strings.Contains(result, "script output here"))
}

func TestFormatLogsWithTimingEmptyOutput(t *testing.T) {
	s := sandbox.NewTestSandbox()
	start := time.Date(2025, 1, 15, 10, 0, 0, 0, time.UTC)
	end := time.Date(2025, 1, 15, 10, 0, 1, 0, time.UTC)

	result := s.TestFormatLogsWithTiming(start, end, "")

	assert.True(t, strings.Contains(result, "=== Script Execution Report ==="))
	assert.True(t, strings.HasSuffix(result, "===============================\n\n"))
}
