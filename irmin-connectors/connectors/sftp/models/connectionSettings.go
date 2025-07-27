package sftpmodels

import (
	"irmin-connectors/utils"
)

const (
	// TrueValue represents the string "true" for boolean comparisons.
	TrueValue = "true"
)

type ConnectionSettings struct {
	RemotePath         string   `json:"remote_path"`         // Default remote directory path
	FilePatterns       []string `json:"file_patterns"`       // File patterns to include/exclude
	PreserveTimestamps bool     `json:"preserve_timestamps"` // Whether to preserve file modification times
	OverwriteExisting  bool     `json:"overwrite_existing"`  // Whether to overwrite existing files during push
	CreateDirectories  bool     `json:"create_directories"`  // Whether to create missing directories
	TransferMode       string   `json:"transfer_mode"`       // "binary" or "text" transfer mode
}

// NewConnectionSettingsFromMap creates a ConnectionSettings from a map[string]any.
func NewConnectionSettingsFromMap(settings map[string]any) (*ConnectionSettings, error) {
	preserveTimestampsStr := utils.GetStringFromMap(settings, "preserve_timestamps", "false")
	overwriteExistingStr := utils.GetStringFromMap(settings, "overwrite_existing", "false")
	createDirectoriesStr := utils.GetStringFromMap(settings, "create_directories", TrueValue)

	// Handle file patterns - for now use default patterns if not specified
	filePatterns := []string{"*"} // Default to all files
	if patterns, exists := settings["file_patterns"]; exists && patterns != nil {
		if patternSlice, ok := patterns.([]string); ok {
			filePatterns = patternSlice
		} else if patternStr, isString := patterns.(string); isString && patternStr != "" {
			filePatterns = []string{patternStr}
		}
	}

	cs := &ConnectionSettings{
		RemotePath:         utils.GetStringFromMap(settings, "remote_path", "/"),
		FilePatterns:       filePatterns,
		PreserveTimestamps: preserveTimestampsStr == TrueValue,
		OverwriteExisting:  overwriteExistingStr == TrueValue,
		CreateDirectories:  createDirectoriesStr == TrueValue,
		TransferMode:       utils.GetStringFromMap(settings, "transfer_mode", "binary"),
	}

	// Validate transfer mode
	if cs.TransferMode != "binary" && cs.TransferMode != "text" {
		cs.TransferMode = "binary" // Default to binary if invalid
	}

	return cs, nil
}
