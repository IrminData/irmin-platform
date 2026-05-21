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
	env    *utils.CoreAPIEnv
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
		Target: env.DaytonaTarget,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Daytona client: %w", err)
	}

	return &daytonaClient{
		client: client,
		logger: logger,
		env:    env,
	}, nil
}

// snapshotForRuntime returns the configured Daytona snapshot name for the given runtime,
// or "" if no snapshot is configured (caller should fall back to a raw image).
// Opt-in is explicit: an unset env var means "use image", not "use the default snapshot".
// SnapshotGoDefault is the seed-script default, not the runtime default.
func snapshotForRuntime(env *utils.CoreAPIEnv, runtimeType string) string {
	if env == nil {
		return ""
	}
	switch runtimeType {
	case RuntimeTypeGo:
		return env.DaytonaSnapshotGo
	default:
		return ""
	}
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
// If a Daytona snapshot is configured for the runtime, the sandbox is booted from it;
// otherwise it falls back to a raw Docker image. The returned snapshotUsed flag tells
// callers whether per-run runtime bootstrap (e.g. installing SDK packages) can be skipped.
func (d *daytonaClient) createSandbox(
	ctx context.Context,
	runtimeType string,
	envVars map[string]string,
) (*daytona.Sandbox, bool, error) {
	resources := &types.Resources{
		CPU:    DaytonaDefaultCPU,
		Memory: DaytonaDefaultMemory,
		Disk:   DaytonaDefaultDisk,
	}

	if snapshot := snapshotForRuntime(d.env, runtimeType); snapshot != "" {
		d.logger.InfoContext(ctx, "Creating Daytona sandbox",
			"mode", "snapshot",
			"snapshot", snapshot,
			"runtime", runtimeType,
			"target", d.env.DaytonaTarget,
			"cpu", DaytonaDefaultCPU,
			"memory_gb", DaytonaDefaultMemory,
			"disk_gb", DaytonaDefaultDisk,
		)

		// Snapshots bake their resource sizing at creation time, so SnapshotParams
		// intentionally has no Resources field — the seed step is responsible for sizing.
		sb, err := d.client.Create(ctx, types.SnapshotParams{
			SandboxBaseParams: types.SandboxBaseParams{
				EnvVars: envVars,
			},
			Snapshot: snapshot,
		}, options.WithTimeout(DaytonaCreateTimeout))
		if err != nil {
			return nil, false, fmt.Errorf("failed to create Daytona sandbox from snapshot %q: %w", snapshot, err)
		}

		d.logger.InfoContext(ctx, "Daytona sandbox created",
			"mode", "snapshot",
			"sandbox_id", sb.ID,
			"sandbox_name", sb.Name,
		)

		return sb, true, nil
	}

	image, err := dockerImageForRuntime(runtimeType)
	if err != nil {
		return nil, false, err
	}

	d.logger.InfoContext(ctx, "Creating Daytona sandbox",
		"mode", "image",
		"image", image,
		"runtime", runtimeType,
		"target", d.env.DaytonaTarget,
		"cpu", DaytonaDefaultCPU,
		"memory_gb", DaytonaDefaultMemory,
		"disk_gb", DaytonaDefaultDisk,
	)

	sb, err := d.client.Create(ctx, types.ImageParams{
		SandboxBaseParams: types.SandboxBaseParams{
			EnvVars: envVars,
		},
		Image:     image,
		Resources: resources,
	}, options.WithTimeout(DaytonaCreateTimeout))
	if err != nil {
		return nil, false, fmt.Errorf("failed to create Daytona sandbox: %w", err)
	}

	d.logger.InfoContext(ctx, "Daytona sandbox created",
		"mode", "image",
		"sandbox_id", sb.ID,
		"sandbox_name", sb.Name,
	)

	return sb, false, nil
}
