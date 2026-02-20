package sandbox

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/utils"
	"log/slog"

	"github.com/daytonaio/daytona/libs/sdk-go/pkg/daytona"
	"github.com/daytonaio/daytona/libs/sdk-go/pkg/options"
	"github.com/daytonaio/daytona/libs/sdk-go/pkg/types"
)

// daytonaClient wraps the Daytona SDK client with sandbox creation helpers.
type daytonaClient struct {
	client *daytona.Client
	logger *slog.Logger
}

// newDaytonaClient creates a Daytona client from environment config.
// Returns an error if the required DAYTONA_API_KEY is not set.
func newDaytonaClient(env *utils.CoreAPIEnv, logger *slog.Logger) (*daytonaClient, error) {
	if env.DaytonaAPIKey == "" {
		return nil, errors.New("DAYTONA_API_KEY is required for compute sandbox")
	}

	client, err := daytona.NewClientWithConfig(&types.DaytonaConfig{
		APIKey: env.DaytonaAPIKey,
		APIUrl: env.DaytonaAPIURL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Daytona client: %w", err)
	}

	return &daytonaClient{
		client: client,
		logger: logger,
	}, nil
}

// dockerImageForRuntime returns the Docker image for the given runtime type.
func dockerImageForRuntime(runtimeType string) (string, error) {
	switch runtimeType {
	case RuntimeTypeGo:
		return DockerImageGo, nil
	case RuntimeTypePython:
		return DockerImagePython, nil
	case RuntimeTypeNode:
		return DockerImageNode, nil
	default:
		return "", fmt.Errorf("unsupported runtime type: %s", runtimeType)
	}
}

// createSandbox creates an ephemeral Daytona sandbox for the given runtime type.
// The sandbox is created with default resource limits and the specified environment variables.
func (d *daytonaClient) createSandbox(
	ctx context.Context,
	runtimeType string,
	envVars map[string]string,
) (*daytona.Sandbox, error) {
	image, err := dockerImageForRuntime(runtimeType)
	if err != nil {
		return nil, err
	}

	d.logger.InfoContext(ctx, "Creating Daytona sandbox",
		"image", image,
		"runtime", runtimeType,
		"cpu", DaytonaDefaultCPU,
		"memory_gb", DaytonaDefaultMemory,
		"disk_gb", DaytonaDefaultDisk,
	)

	sb, err := d.client.Create(ctx, types.ImageParams{
		SandboxBaseParams: types.SandboxBaseParams{
			EnvVars: envVars,
		},
		Image: image,
		Resources: &types.Resources{
			CPU:    DaytonaDefaultCPU,
			Memory: DaytonaDefaultMemory,
			Disk:   DaytonaDefaultDisk,
		},
	}, options.WithTimeout(DaytonaCreateTimeout))
	if err != nil {
		return nil, fmt.Errorf("failed to create Daytona sandbox: %w", err)
	}

	d.logger.InfoContext(ctx, "Daytona sandbox created",
		"sandbox_id", sb.ID,
		"sandbox_name", sb.Name,
	)

	return sb, nil
}
