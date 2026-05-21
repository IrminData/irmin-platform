package sandbox

import "time"

const (
	// Daytona sandbox resource configuration.

	DaytonaDefaultCPU    = 2               // vCPUs per sandbox
	DaytonaDefaultMemory = 2               // GB per sandbox
	DaytonaDefaultDisk   = 5               // GB per sandbox
	DaytonaCreateTimeout = 2 * time.Minute // Maximum time to wait for sandbox creation

	// Docker images per runtime type.

	DockerImageGo     = "golang:1.25"
	DockerImagePython = "python:3.11"
	DockerImageNode   = "node:24"

	// Daytona snapshot defaults. Bump the version suffix whenever the snapshot
	// contents change (base image, baked SDK version, etc.) so old and new
	// workflows do not collide mid-deploy. Re-seed with `-seed-snapshots`.

	SnapshotGoDefault = "irmin-go-1.25-sdk-v1"

	// Workspace directory inside Daytona sandbox.

	SandboxWorkDir = "/workspace"

	// Runtime versions.

	LatestGoVersion = "1.25.0"

	// Runtime types.

	RuntimeTypePython = "python"
	RuntimeTypeGo     = "go"
	RuntimeTypeNode   = "node"

	// API configuration.

	TokenExpiryDuration = 60 * time.Minute // How long API tokens created for sandbox execution should be valid

	// Execution configuration.

	MaxConcurrentExecutions = 50 // Maximum concurrent sandbox executions
)
