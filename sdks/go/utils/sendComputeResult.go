package irminutils

import (
	"fmt"
	"os"
)

// SendComputeResult writes the provided data to a file with the given name
// in the current working directory. This file will be used to pass computation
// results back to the host system from within the container.
func SendComputeResult(data []byte, fileName string) error {
	// Make sure we have a valid file name
	if fileName == "" {
		fileName = "result.json" // Default name if none provided
	}

	// Write the data to the file with group-readable permissions
	// 0660 allows the host system (running as different user in same group) to read results
	//nolint:gosec // G306: Group-writable is intentional for shared access between appuser and sandbox
	err := os.WriteFile(fileName, data, 0660)

	if err != nil {
		return fmt.Errorf("failed to write result file: %w", err)
	}

	// Log that we've written the result file so it can be parsed from logs if needed
	fmt.Fprintf(os.Stdout, "<RESULT_FILE_WRITTEN>%s</RESULT_FILE_WRITTEN>", fileName)

	return nil
}
