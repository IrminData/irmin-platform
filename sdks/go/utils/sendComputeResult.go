package irminUtils

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

	// Write the data to the file
	err := os.WriteFile(fileName, data, 0644)

	if err != nil {
		return fmt.Errorf("failed to write result file: %v", err)
	}

	// Log that we've written the result file so it can be parsed from logs if needed
	fmt.Printf("<RESULT_FILE_WRITTEN>%s</RESULT_FILE_WRITTEN>", fileName)

	return nil
}
