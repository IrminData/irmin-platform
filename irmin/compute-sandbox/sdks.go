package sandbox

import (
	"context"
	"fmt"
	"os/exec"
)

// installGoSDK retrieves the Go SDK by running "go get" in the destination directory.
// Returns an error if the installation fails.
func (s *ComputeSandbox) installGoSDK(ctx context.Context, destDir string, projectName string) error {
	// Prepare the module initialization command.
	cmd := exec.Command("go", "mod", "init", projectName)
	cmd.Dir = destDir // Set the working directory to the destination directory.
	if cmdRunErr := cmd.Run(); cmdRunErr != nil {
		return fmt.Errorf("failed to initialize go module: %w", cmdRunErr)
	}
	// Prepare the SDK installation command.
	cmd = exec.Command(
		"go",
		"get",
		"github.com/IrminData/irmin-sdk-go",
		"github.com/IrminData/irmin-sdk-go/core-api",
		"github.com/IrminData/irmin-sdk-go/utils",
	)
	cmd.Dir = destDir // Set the working directory to the destination directory.
	// Run the command and capture combined output.
	output, outputErr := cmd.CombinedOutput()
	if outputErr != nil {
		return fmt.Errorf("failed to get go sdk: %w, output: %s", outputErr, output)
	}
	s.logger.InfoContext(ctx, "Go SDK installed successfully", "destDir", destDir)
	return nil
}
