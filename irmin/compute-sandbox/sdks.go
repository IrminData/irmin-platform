package sandbox

import (
	"context"
	"os/exec"
)

// installGoSDK installs the Go SDK for the given workspace.
func (s *ComputeSandbox) installGoSDK(ctx context.Context, workspaceTempDir, projectName string) error {
	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Initialize go module with context and timeout
	initCtx, cancelInitCtx := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancelInitCtx()

	cmd := exec.CommandContext(initCtx, "go", "mod", "init", projectName)
	cmd.Dir = workspaceTempDir
	if err := cmd.Run(); err != nil {
		return err
	}

	// Check for context cancellation before go version update
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Update go version in go.mod with context and timeout
	versionCtx, cancelVersionCtx := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancelVersionCtx()

	cmd = exec.CommandContext(versionCtx, "go", "mod", "edit", "-go="+LatestGoVersion)
	cmd.Dir = workspaceTempDir
	if err := cmd.Run(); err != nil {
		return err
	}

	// Check for context cancellation before package installation
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Install the three specific packages as originally intended
	packages := []string{
		"github.com/IrminData/irmin-sdk-go",
		"github.com/IrminData/irmin-sdk-go/core-api",
		"github.com/IrminData/irmin-sdk-go/utils",
	}

	for _, pkg := range packages {
		// Check for context cancellation before each package installation
		if ctx.Err() != nil {
			return ctx.Err()
		}

		getCtx, cancelGetCtx := context.WithTimeout(ctx, DockerCommandTimeout)
		cmd = exec.CommandContext(getCtx, "go", "get", pkg)
		cmd.Dir = workspaceTempDir
		if err := cmd.Run(); err != nil {
			cancelGetCtx()
			return err
		}
		cancelGetCtx()
	}

	return nil
}
