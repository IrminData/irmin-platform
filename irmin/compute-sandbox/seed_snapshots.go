package sandbox

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/utils"
	"log/slog"

	"github.com/daytonaio/daytona/libs/sdk-go/pkg/daytona"
	daytonaerrors "github.com/daytonaio/daytona/libs/sdk-go/pkg/errors"
	"github.com/daytonaio/daytona/libs/sdk-go/pkg/types"
)

// Daytona snapshot states we care about. The SDK exposes State as a plain string
// (see types.Snapshot); the canonical enum lives in
// github.com/daytonaio/daytona/libs/api-client-go.model_snapshot_state.
// We mirror the strings here to avoid importing the internal api-client package
// for two constants.
const (
	snapshotStateActive      = "active"
	snapshotStateError       = "error"
	snapshotStateBuildFailed = "build_failed"
)

// SeedSnapshots builds and registers the Daytona snapshots used by the compute sandbox.
//
// Today it only seeds the Go runtime. When a new runtime's SDK ships (Python, Node),
// add another seed block here mirroring the Go one and update the four touchpoints
// listed in compute-sandbox/README.md ("Adding a new runtime snapshot"):
// snapshotForRuntime, the env loader, the runtime's default constant, and this function.
//
// The seed is idempotent per runtime: if a snapshot with the target name already exists,
// that runtime is skipped. To rebuild, bump the version suffix on the runtime's default
// constant (e.g. SnapshotGoDefault) and re-run.
//
// The seed targets DAYTONA_TARGET (region) — snapshots are per-region, so the seed must
// be run against the same region as the runtime API.
func SeedSnapshots(ctx context.Context, env *utils.CoreAPIEnv, logger *slog.Logger) error {
	dc, err := newDaytonaClient(env, logger)
	if err != nil {
		return fmt.Errorf("failed to create Daytona client: %w", err)
	}

	name := env.DaytonaSnapshotGo
	if name == "" {
		name = SnapshotGoDefault
	}

	logger.InfoContext(ctx, "Seeding Daytona snapshot",
		"snapshot", name,
		"runtime", RuntimeTypeGo,
		"target", env.DaytonaTarget,
	)

	existing, getErr := dc.client.Snapshot.Get(ctx, name)
	switch {
	case getErr == nil && existing != nil:
		// Only "active" snapshots are reusable. Failed builds left over from a previous
		// run must be deleted explicitly — auto-deleting would mask real platform issues
		// (e.g. SDK install repeatedly failing in the bake step).
		switch existing.State {
		case snapshotStateActive:
			logger.InfoContext(ctx, "Snapshot already active; skipping (bump version to rebuild)",
				"snapshot", name,
				"state", existing.State,
			)
			return nil
		case snapshotStateError, snapshotStateBuildFailed:
			reason := ""
			if existing.ErrorReason != nil {
				reason = ": " + *existing.ErrorReason
			}
			return fmt.Errorf(
				"snapshot %q exists but is in state %q from a prior failed build%s; "+
					"delete it via the Daytona dashboard or API and re-run -seed-snapshots",
				name, existing.State, reason,
			)
		default:
			// pending / building / pulling / inactive / removing — another seed may be
			// in progress, or a previous one died mid-build. Don't try to create over it.
			return fmt.Errorf(
				"snapshot %q exists in non-terminal state %q; another seed may be in progress — "+
					"wait for it to finish or delete the snapshot and retry",
				name, existing.State,
			)
		}
	case getErr != nil:
		// Only "not found" means "go ahead and build". Surface auth/5xx/network errors
		// instead of silently retrying as Create — those produce confusing downstream messages.
		var notFound *daytonaerrors.DaytonaNotFoundError
		if !errors.As(getErr, &notFound) {
			return fmt.Errorf("failed to check existing snapshot %q: %w", name, getErr)
		}
	}

	image := daytona.Base(DockerImageGo).
		Workdir(SandboxWorkDir).
		Run("go mod init sandbox").
		Run(fmt.Sprintf("go mod edit -go=%s", LatestGoVersion)).
		Run("go get github.com/IrminData/irmin-sdk-go").
		Run("go get github.com/IrminData/irmin-sdk-go/api").
		Run("go get github.com/IrminData/irmin-sdk-go/utils")

	snapshot, logChan, err := dc.client.Snapshot.Create(ctx, &types.CreateSnapshotParams{
		Name:  name,
		Image: image,
		Resources: &types.Resources{
			CPU:    DaytonaDefaultCPU,
			Memory: DaytonaDefaultMemory,
			Disk:   DaytonaDefaultDisk,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create snapshot %q: %w", name, err)
	}

	for line := range logChan {
		logger.InfoContext(ctx, "snapshot build", "snapshot", name, "line", line)
	}

	if snapshot == nil {
		return errors.New("snapshot create returned nil snapshot")
	}

	// The snapshot pointer from Create reflects the INITIAL state (pending/building).
	// The SDK's log-streaming goroutine waits for a terminal state internally but, when
	// the build fails, returns the error as a "Error: ..." line on logChan rather than
	// surfacing it to the caller — so the loop above exits with nil even on failure.
	// Re-fetch to verify the final state before declaring success.
	final, finalErr := dc.client.Snapshot.Get(ctx, name)
	if finalErr != nil {
		return fmt.Errorf("snapshot %q create finished but final state could not be verified: %w", name, finalErr)
	}
	if final == nil {
		return fmt.Errorf("snapshot %q create finished but Get returned nil", name)
	}
	if final.State != snapshotStateActive {
		reason := ""
		if final.ErrorReason != nil {
			reason = ": " + *final.ErrorReason
		}
		return fmt.Errorf(
			"snapshot %q ended in non-active state %q%s; delete it via the Daytona "+
				"dashboard or API and re-run -seed-snapshots",
			name, final.State, reason,
		)
	}

	logger.InfoContext(ctx, "Snapshot seeded",
		"snapshot", final.Name,
		"snapshot_id", final.ID,
		"state", final.State,
	)

	return nil
}
