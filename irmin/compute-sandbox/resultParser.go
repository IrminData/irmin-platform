package sandbox

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// Helper function to parse result file names from logs.
func parseResultFiles(logs string) []string {
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
// - containerID: the ID of the container.
// - filePath: the full path to the file within the container.
//
// Returns:
// - A byte slice containing the file's content if successful.
// - An error if the file cannot be read.
func readResultFileFromContainer(containerID, filePath string) ([]byte, error) {
	// Create a temporary file to copy the container file into.
	tmpFile, err := os.CreateTemp("", "docker-file-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary file: %w", err)
	}
	// Ensure the temporary file is removed afterwards.
	defer os.Remove(tmpFile.Name())
	// Close the file as docker cp will write to it.
	tmpFile.Close()

	// Construct the source identifier for docker cp in the format "containerID:filePath".
	source := fmt.Sprintf("%s:%s", containerID, filePath)

	// Execute the docker cp command to copy the file from the container to the temporary file.
	cpCmd := exec.Command("docker", "cp", source, tmpFile.Name())
	if err := cpCmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to copy file from container: %w", err)
	}

	// Read the content of the temporary file.
	data, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to read temporary file: %w", err)
	}

	return data, nil
}
