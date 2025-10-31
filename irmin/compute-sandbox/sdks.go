package sandbox

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
)

// runGoCommandInDocker executes a Go command inside a Docker container.
func (s *ComputeSandbox) runGoCommandInDocker(ctx context.Context, workspaceTempDir string, args ...string) error {
	dockerArgs := []string{
		"run", "--rm",
		"-v", fmt.Sprintf("%s:/usr/src/app", workspaceTempDir),
		"-w", "/usr/src/app",
		fmt.Sprintf("golang:%s", LatestGoVersion),
		"go",
	}
	dockerArgs = append(dockerArgs, args...)

	cmd := exec.CommandContext(ctx, "docker", dockerArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		s.logger.ErrorContext(ctx, "Go command failed in Docker",
			"command", strings.Join(args, " "),
			"error", err,
			"output", string(output))
		return fmt.Errorf("go %s failed: %w\nOutput: %s", strings.Join(args, " "), err, string(output))
	}

	s.logger.InfoContext(ctx, "Go command executed successfully in Docker",
		"command", strings.Join(args, " "))

	return nil
}

// installGoSDK installs the Go SDK for the given workspace using Docker.
func (s *ComputeSandbox) installGoSDK(ctx context.Context, workspaceTempDir, projectName string) error {
	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Initialize go module with context and timeout
	initCtx, cancelInitCtx := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancelInitCtx()

	if err := s.runGoCommandInDocker(initCtx, workspaceTempDir, "mod", "init", projectName); err != nil {
		return err
	}

	// Check for context cancellation before go version update
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Update go version in go.mod with context and timeout
	versionCtx, cancelVersionCtx := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancelVersionCtx()

	if err := s.runGoCommandInDocker(versionCtx, workspaceTempDir, "mod", "edit", "-go="+LatestGoVersion); err != nil {
		return err
	}

	// Check for context cancellation before package installation
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Install the three specific packages as originally intended
	packages := []string{
		"github.com/IrminData/irmin-sdk-go",
		"github.com/IrminData/irmin-sdk-go/api",
		"github.com/IrminData/irmin-sdk-go/utils",
	}

	for _, pkg := range packages {
		// Check for context cancellation before each package installation
		if ctx.Err() != nil {
			return ctx.Err()
		}

		getCtx, cancelGetCtx := context.WithTimeout(ctx, DockerCommandTimeout)
		if err := s.runGoCommandInDocker(getCtx, workspaceTempDir, "get", pkg); err != nil {
			cancelGetCtx()
			return err
		}
		cancelGetCtx()
	}

	return nil
}
