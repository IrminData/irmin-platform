package sandbox

import (
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
