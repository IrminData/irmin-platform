package sandbox

import "time"

const (
	// File operation timeouts.

	FileDownloadTimeout  = 300 * time.Second // 5 minutes for large files
	FileUploadTimeout    = 180 * time.Second // 3 minutes
	FileOperationTimeout = 30 * time.Second  // Timeout for general file operations

	// Runtime versions.

	LatestGoVersion     = "1.25.0"
	LatestNodeVersion   = "24.2.0"
	LatestPythonVersion = "3.11.12"

	// Runtime types.

	RuntimeTypePython     = "python"
	RuntimeTypeGo         = "go"
	RuntimeTypeNode       = "node"
	RuntimeTypeTypeScript = "typescript"

	// Interpreter executables (full paths for sudo).

	InterpreterPython     = "/usr/bin/python3"
	InterpreterGo         = "/usr/local/go/bin/go"
	InterpreterNode       = "/usr/bin/node"
	InterpreterTypeScript = "/usr/bin/npx"

	// API configuration.

	TokenExpiryDuration = 60 * time.Minute // How long API tokens created for sandbox execution should be valid

	// Execution configuration.

	MaxConcurrentExecutions = 50 // Maximum concurrent script executions (each in its own temp dir)
)
