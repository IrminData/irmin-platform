package sandbox

import (
	"context"
	"io"
	"irmin-api/utils"
	"log/slog"
	"strings"
	"time"
)

// NewTestSandbox creates a minimal ComputeSandbox for testing pure logic methods.
func NewTestSandbox() *ComputeSandbox {
	return &ComputeSandbox{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

// NewTestSandboxWithLogBuffer creates a ComputeSandbox that captures warn-level logs.
func NewTestSandboxWithLogBuffer(buf *strings.Builder) *ComputeSandbox {
	return &ComputeSandbox{
		logger: slog.New(slog.NewTextHandler(buf, &slog.HandlerOptions{Level: slog.LevelWarn})),
	}
}

// Test wrappers for unexported methods and functions.

// TestDetermineExecutableTypeAndFileName wraps determineExecutableTypeAndFileName for testing.
func (s *ComputeSandbox) TestDetermineExecutableTypeAndFileName(
	language string,
) (string, string, error) {
	return s.determineExecutableTypeAndFileName(language)
}

// TestBuildExecutionCommand wraps buildExecutionCommand for testing.
func (s *ComputeSandbox) TestBuildExecutionCommand(
	runtimeType, scriptFileName, apiKey, apiURL string,
) string {
	return s.buildExecutionCommand(runtimeType, scriptFileName, apiKey, apiURL)
}

// TestBuildScriptLockKey wraps buildScriptLockKey for testing.
func (s *ComputeSandbox) TestBuildScriptLockKey(scriptID uint) string {
	return s.buildScriptLockKey(scriptID)
}

// TestParseResultFiles wraps parseResultFiles for testing.
func (s *ComputeSandbox) TestParseResultFiles(logs string) []string {
	return s.parseResultFiles(logs)
}

// TestScanScriptContent wraps scanScriptContent for testing.
func (s *ComputeSandbox) TestScanScriptContent(ctx context.Context, content, scriptFileName string) {
	s.scanScriptContent(ctx, content, scriptFileName)
}

// TestFormatLogsWithTiming wraps formatLogsWithTiming for testing.
func (s *ComputeSandbox) TestFormatLogsWithTiming(startTime, endTime time.Time, output string) string {
	return s.formatLogsWithTiming(startTime, endTime, output)
}

// ExportDockerImageForRuntime wraps dockerImageForRuntime for testing.
var ExportDockerImageForRuntime = dockerImageForRuntime

// NewTestSandboxWithDaytona creates a ComputeSandbox with a real Daytona client
// but no database, suitable for integration tests that call TestExecuteDaytona directly.
func NewTestSandboxWithDaytona(apiKey, apiURL string, logger *slog.Logger) (*ComputeSandbox, error) {
	env := &utils.CoreAPIEnv{
		DaytonaAPIKey: apiKey,
		DaytonaAPIURL: apiURL,
	}

	dc, err := newDaytonaClient(env, logger)
	if err != nil {
		return nil, err
	}

	return &ComputeSandbox{
		logger:  logger,
		daytona: dc,
	}, nil
}

// TestExecuteDaytona wraps executeDaytona for integration testing without a database.
func (s *ComputeSandbox) TestExecuteDaytona(
	ctx context.Context,
	scriptContent string,
	inputFiles map[string][]byte,
	runtimeType, scriptFileName, apiKey, apiURL string,
) (ExecutionResult, error) {
	return s.executeDaytona(ctx, scriptContent, inputFiles, runtimeType, scriptFileName, apiKey, apiURL)
}
