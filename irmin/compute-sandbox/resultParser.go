package sandbox

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// Helper function to parse result file names from logs.
func (s *ComputeSandbox) parseResultFiles(logs string) []string {
	var resultFiles []string

	// Find all result file markers
	startTag := "<RESULT_FILE_WRITTEN>"
	endTag := "</RESULT_FILE_WRITTEN>"

	startIndex := 0
	for {
		// Find the next start tag
		startPos := strings.Index(logs[startIndex:], startTag)
		if startPos == -1 {
			break // No more tags found
		}
		startPos += startIndex // Adjust to the full logs string

		// Find the corresponding end tag
		endPos := strings.Index(logs[startPos:], endTag)
		if endPos == -1 {
			break // Malformed tag, no end tag found
		}
		endPos += startPos // Adjust to the full logs string

		// Extract the file name
		fileName := logs[startPos+len(startTag) : endPos]
		if fileName != "" {
			resultFiles = append(resultFiles, fileName)
		}

		// Move past this tag for the next iteration
		startIndex = endPos + len(endTag)
	}

	return resultFiles
}

// readResultFileFromContainer reads and retrieves the content of a file from the container's file system.
// Instead of using 'cat', this function uses 'docker cp' to copy the file from the container to a temporary
// file on the host system. It then reads the file's bytes and cleans up the temporary file.
//
// Parameters:
// - ctx: context for cancellation and timeout control.
// - containerID: the ID of the container.
// - filePath: the full path to the file within the container.
//
// Returns:
// - A byte slice containing the file's content if successful.
// - An error if the file cannot be read.
func (s *ComputeSandbox) readResultFileFromContainer(
	ctx context.Context,
	containerID, filePath string,
) ([]byte, error) {
	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	// Sanitize container ID to prevent command injection
	sanitizedID := sanitizeContainerID(containerID)
	if sanitizedID == "" {
		return nil, fmt.Errorf("invalid container ID: %s", containerID)
	}

	// Create a temporary file to copy the container file into.
	tmpFile, createTempFileErr := os.CreateTemp("", "docker-file-*")
	if createTempFileErr != nil {
		return nil, fmt.Errorf("failed to create temporary file: %w", createTempFileErr)
	}
	// Ensure the temporary file is removed afterwards.
	defer os.Remove(tmpFile.Name())
	// Close the file as docker cp will write to it.
	defer tmpFile.Close()

	// Construct the source identifier for docker cp in the format "containerID:filePath".
	source := fmt.Sprintf("%s:%s", sanitizedID, filePath)

	// Execute the docker cp command to copy the file from the container to the temporary file.
	// Use context with timeout for the docker cp operation
	cpCtx, cancel := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancel()

	cpCmd := exec.CommandContext(cpCtx, "docker", "cp", source, tmpFile.Name())
	if runCpCmdErr := cpCmd.Run(); runCpCmdErr != nil {
		return nil, fmt.Errorf("failed to copy file from container: %w", runCpCmdErr)
	}

	// Check for context cancellation before reading file
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	// Read the content of the temporary file.
	data, readFileErr := os.ReadFile(tmpFile.Name())
	if readFileErr != nil {
		return nil, fmt.Errorf("failed to read temporary file: %w", readFileErr)
	}

	return data, nil
}
