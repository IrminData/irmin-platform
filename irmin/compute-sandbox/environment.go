package sandbox

import (
	"fmt"
)

// buildSandboxEnvironment creates a minimal, safe environment for script execution.
// CRITICAL: This prevents scripts from accessing database credentials, S3 keys,
// API secrets, and other sensitive environment variables from the parent process.
func (e *executor) buildSandboxEnvironment(workspaceDir string) []string {
	return []string{
		// Minimal PATH - only standard binaries
		"PATH=/usr/local/bin:/usr/bin:/bin",

		// Set home to workspace to prevent access to real home directory
		fmt.Sprintf("HOME=%s", workspaceDir),

		// Language and locale settings
		"LANG=C.UTF-8",
		"LC_ALL=C.UTF-8",

		// Temp directory restricted to sandbox workspace (use subdirectory to avoid Go's temp root detection)
		fmt.Sprintf("TMPDIR=%s/.tmp", workspaceDir),

		// Prevent Go from accessing global cache
		fmt.Sprintf("GOPATH=%s/.go", workspaceDir),
		fmt.Sprintf("GOMODCACHE=%s/.go/pkg/mod", workspaceDir),
		fmt.Sprintf("GOCACHE=%s/.go/cache", workspaceDir),
		fmt.Sprintf("GOTMPDIR=%s/.go/tmp", workspaceDir),

		// Python isolation
		fmt.Sprintf("PYTHONUSERBASE=%s/.python", workspaceDir),
		"PYTHONDONTWRITEBYTECODE=1",

		// Node isolation
		fmt.Sprintf("NPM_CONFIG_CACHE=%s/.npm", workspaceDir),
		fmt.Sprintf("NODE_PATH=%s/.node_modules", workspaceDir),

		// CRITICAL: No DATABASE_CONNECTION_STRING
		// CRITICAL: No S3_ACCESS_KEY_ID or S3_ACCESS_SECRET
		// CRITICAL: No CLERK_SECRET_KEY or other API keys
		// Scripts receive API token via CLI arguments only
	}
}
