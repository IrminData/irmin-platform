package sandbox_test

import (
	"context"
	"encoding/json"
	"irmin-api/utils"
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"

	sandbox "irmin-api/compute-sandbox"

	"github.com/zeebo/assert"
)

// setupTestSandbox creates a ComputeSandbox backed by a real Daytona service.
// It loads the .env file via utils.LoadEnv and skips when DAYTONA_API_KEY is not configured.
func setupTestSandbox(t *testing.T) *sandbox.ComputeSandbox {
	t.Helper()

	env, err := utils.LoadEnv()
	if err != nil {
		t.Fatalf("Failed to load environment: %v", err)
	}

	if env.DaytonaAPIKey == "" {
		t.Skip("Skipping integration test — DAYTONA_API_KEY not set")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	sb, err := sandbox.NewTestSandboxWithDaytona(env, logger)
	if err != nil {
		t.Fatalf("Failed to create test sandbox: %v", err)
	}

	return sb
}

// testCtx returns a context with a generous timeout suitable for Daytona
// sandbox creation + script execution.
func testCtx(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Minute)
	t.Cleanup(cancel)
	return ctx
}

// execScript is a shorthand for calling TestExecuteDaytona with the given
// language and script content, returning the result.
func execScript(
	t *testing.T,
	sb *sandbox.ComputeSandbox,
	ctx context.Context,
	language, scriptContent string,
	inputFiles map[string][]byte,
) (sandbox.ExecutionResult, error) {
	t.Helper()

	runtimeType, scriptFileName, err := sb.TestDetermineExecutableTypeAndFileName(language)
	if err != nil {
		return sandbox.ExecutionResult{}, err
	}

	return sb.TestExecuteDaytona(
		ctx, scriptContent, inputFiles,
		runtimeType, scriptFileName, "test-key", "http://localhost/api",
	)
}

// ---------------------------------------------------------------------------
// Language execution tests
// ---------------------------------------------------------------------------

func TestExecutePythonScript(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	result, err := execScript(t, sb, ctx, "python",
		`import csv

# Read input file
with open('_input/data.csv') as f:
    reader = csv.reader(f)
    rows = list(reader)

print(f"Read {len(rows)} rows")

# Write output file
with open('output.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    for row in rows:
        writer.writerow(row)

print("<RESULT_FILE_WRITTEN>output.csv</RESULT_FILE_WRITTEN>")
`,
		map[string][]byte{"data.csv": []byte("a,b\n1,2\n3,4\n")},
	)

	assert.NoError(t, err)
	assert.True(t, strings.Contains(result.Logs, "Script Execution Report"))
	assert.True(t, strings.Contains(result.Logs, "Read 3 rows"))
	assert.True(t, result.ResultFiles != nil)
	assert.True(t, len(result.ResultFiles["output.csv"]) > 0)
}

func TestExecuteGoScript(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	result, err := execScript(t, sb, ctx, "go",
		`package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Println("hello from go")
	if err := os.WriteFile("output.txt", []byte("go result"), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "write error: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("<RESULT_FILE_WRITTEN>output.txt</RESULT_FILE_WRITTEN>")
}
`, nil)

	assert.NoError(t, err)
	assert.True(t, strings.Contains(result.Logs, "hello from go"))
	assert.True(t, result.ResultFiles != nil)
	assert.True(t, len(result.ResultFiles["output.txt"]) > 0)
	assert.Equal(t, "go result", string(result.ResultFiles["output.txt"]))
}

func TestExecuteJavaScriptScript(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	result, err := execScript(t, sb, ctx, "javascript",
		`const fs = require("fs");
console.log("hello from javascript");
fs.writeFileSync("output.txt", "js result");
console.log("<RESULT_FILE_WRITTEN>output.txt</RESULT_FILE_WRITTEN>");
`, nil)

	assert.NoError(t, err)
	assert.True(t, strings.Contains(result.Logs, "hello from javascript"))
	assert.True(t, result.ResultFiles != nil)
	assert.Equal(t, "js result", string(result.ResultFiles["output.txt"]))
}

func TestExecuteTypeScriptScript(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	result, err := execScript(t, sb, ctx, "typescript",
		`const fs = require("fs");
const msg: string = "hello from typescript";
console.log(msg);
fs.writeFileSync("output.txt", "ts result");
console.log("<RESULT_FILE_WRITTEN>output.txt</RESULT_FILE_WRITTEN>");
`, nil)

	assert.NoError(t, err)
	assert.True(t, strings.Contains(result.Logs, "hello from typescript"))
	assert.True(t, result.ResultFiles != nil)
	assert.Equal(t, "ts result", string(result.ResultFiles["output.txt"]))
}

// ---------------------------------------------------------------------------
// Input file tests
// ---------------------------------------------------------------------------

func TestExecuteWithInputFiles(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	inputFiles := map[string][]byte{
		"config.json":     []byte(`{"key":"test_value"}`),
		"data/nested.txt": []byte("nested_content"),
	}

	result, err := execScript(t, sb, ctx, "python",
		`import json

# Read flat input file
with open('_input/config.json') as f:
    config = json.load(f)
print(f"config_key={config['key']}")

# Read nested input file
with open('_input/data/nested.txt') as f:
    nested = f.read().strip()
print(f"nested={nested}")
`, inputFiles)

	assert.NoError(t, err)
	assert.True(t, strings.Contains(result.Logs, "config_key=test_value"))
	assert.True(t, strings.Contains(result.Logs, "nested=nested_content"))
}

func TestExecuteWithMultipleResultFiles(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	result, err := execScript(t, sb, ctx, "python",
		`with open('summary.json', 'w') as f:
    f.write('{"status":"ok"}')
print("<RESULT_FILE_WRITTEN>summary.json</RESULT_FILE_WRITTEN>")

with open('data.csv', 'w') as f:
    f.write('a,b\n1,2\n')
print("<RESULT_FILE_WRITTEN>data.csv</RESULT_FILE_WRITTEN>")
`, nil)

	assert.NoError(t, err)
	assert.True(t, result.ResultFiles != nil)
	assert.Equal(t, 2, len(result.ResultFiles))
	assert.True(t, len(result.ResultFiles["summary.json"]) > 0)
	assert.True(t, len(result.ResultFiles["data.csv"]) > 0)
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

func TestExecuteScriptWithError(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	result, err := execScript(t, sb, ctx, "python",
		`import sys
print("about to fail")
sys.exit(1)
`, nil)

	assert.Error(t, err)
	// The error should mention a non-zero exit code
	assert.True(t, strings.Contains(err.Error(), "exit") || strings.Contains(err.Error(), "sandbox"))
	// Logs should still be captured even on failure (if sandbox was created)
	if result.Logs != "" {
		assert.True(t, strings.Contains(result.Logs, "about to fail"))
	}
}

// ---------------------------------------------------------------------------
// Go SDK integration (irmin-sdk-go utilities)
// ---------------------------------------------------------------------------

func TestExecuteGoSDKIntegration(t *testing.T) {
	sb := setupTestSandbox(t)
	ctx := testCtx(t)

	// This script mirrors the example at compute-sandbox/examples/example.md.
	// It exercises the full Irmin Go SDK flow:
	//   - irminutils.GetAPIFromFlags()   → parses --api-key / --api-url
	//   - irmincore.NewClient()          → creates API client
	//   - irminutils.ListInputFiles()    → lists _input/ directory
	//   - irminutils.GetInputFile()      → reads an input file
	//   - irminutils.SendComputeResult() → writes file + <RESULT_FILE_WRITTEN> tag
	scriptContent := `//go:build ignore

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

func main() {
	ctx := context.Background()

	// Parse API credentials from flags
	apiURL, apiKey, err := irminutils.GetAPIFromFlags()
	if err != nil {
		log.Fatalf("GetAPIFromFlags failed: %v", err)
	}
	fmt.Printf("api-key=%s\n", apiKey)
	fmt.Printf("api-url=%s\n", apiURL)

	// Initialise the Irmin client (mirrors example.md)
	client := irmincore.NewClient(apiURL, apiKey, "en")
	fmt.Println("client-initialised=true")

	// Attempt an API call — will fail with auth error since test-key is not real,
	// but proves the client is wired up and the sandbox has network access.
	_, _, listErr := client.ListWorkspaces(ctx)
	if listErr != nil {
		fmt.Printf("list-workspaces-error=%s\n", listErr.Error())
	}

	// List and read input files using SDK utilities
	files, err := irminutils.ListInputFiles()
	if err != nil {
		log.Fatalf("ListInputFiles failed: %v", err)
	}
	fmt.Printf("input-files=%s\n", strings.Join(files, ","))

	data, err := irminutils.GetInputFile("source.json")
	if err != nil {
		log.Fatalf("GetInputFile failed: %v", err)
	}
	fmt.Printf("input-size=%d\n", len(data))

	// Transform and output using SendComputeResult
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		log.Fatalf("JSON parse failed: %v", err)
	}
	payload["processed"] = true

	output, _ := json.Marshal(payload)
	if err := irminutils.SendComputeResult(output, "result.json"); err != nil {
		log.Fatalf("SendComputeResult failed: %v", err)
	}
	fmt.Println("\ndone")
}
`

	inputFiles := map[string][]byte{
		"source.json": []byte(`{"name":"test","value":42}`),
	}

	runtimeType, scriptFileName, err := sb.TestDetermineExecutableTypeAndFileName("go")
	assert.NoError(t, err)

	result, err := sb.TestExecuteDaytona(
		ctx, scriptContent, inputFiles,
		runtimeType, scriptFileName, "test-api-key-123", "http://test.irmin.local/api",
	)
	assert.NoError(t, err)

	// Verify API credentials were received by the script
	assert.True(t, strings.Contains(result.Logs, "api-key=test-api-key-123"))
	assert.True(t, strings.Contains(result.Logs, "api-url=http://test.irmin.local/api"))

	// Verify SDK client was initialised
	assert.True(t, strings.Contains(result.Logs, "client-initialised=true"))

	// Verify the API call was attempted (expected to fail with auth error)
	assert.True(t, strings.Contains(result.Logs, "list-workspaces-error="))

	// Verify input files were read via SDK utilities
	assert.True(t, strings.Contains(result.Logs, "input-size="))
	assert.True(t, strings.Contains(result.Logs, "input-files=source.json"))

	// Verify result file was collected via SendComputeResult
	assert.True(t, result.ResultFiles != nil)
	assert.True(t, len(result.ResultFiles["result.json"]) > 0)

	// Verify the output content is correct
	var output map[string]any
	err = json.Unmarshal(result.ResultFiles["result.json"], &output)
	assert.NoError(t, err)
	assert.Equal(t, "test", output["name"])
	assert.Equal(t, float64(42), output["value"])
	assert.Equal(t, true, output["processed"])
}

// ---------------------------------------------------------------------------
// Unsupported language
// ---------------------------------------------------------------------------

func TestExecuteUnsupportedLanguage(t *testing.T) {
	_ = setupTestSandbox(t) // skip if no Daytona

	s := sandbox.NewTestSandbox()
	_, _, err := s.TestDetermineExecutableTypeAndFileName("ruby")
	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "unsupported"))
}
