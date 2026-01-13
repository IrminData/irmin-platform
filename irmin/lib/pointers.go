package lib

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// PointerFilePrefix is the prefix used to identify pointer files.
	PointerFilePrefix = "_ptr."
)

var (
	// ErrInvalidPointerContent is returned when the pointer file content is invalid.
	ErrInvalidPointerContent = errors.New("invalid pointer file content")
	// ErrMissingTargetRepository is returned when the target repository is not specified.
	ErrMissingTargetRepository = errors.New("pointer target repository is required")
	// ErrMissingTargetPath is returned when the target path is not specified.
	ErrMissingTargetPath = errors.New("pointer target path is required")
	// ErrMissingTargetRef is returned when the target ref is not specified.
	ErrMissingTargetRef = errors.New("pointer target ref is required")
	// ErrCrossWorkspaceNotSupported is returned when cross-workspace pointers are attempted.
	ErrCrossWorkspaceNotSupported = errors.New("cross-workspace pointers are not yet supported")
)

// ParsePointerFile parses the JSON content of a pointer file and returns the pointer target.
func ParsePointerFile(content []byte) (*irminmodels.PointerTarget, error) {
	if len(content) == 0 {
		return nil, ErrInvalidPointerContent
	}

	var target irminmodels.PointerTarget
	if err := json.Unmarshal(content, &target); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidPointerContent, err)
	}

	// Validate required fields
	if target.Repository == "" {
		return nil, ErrMissingTargetRepository
	}
	if target.Path == "" {
		return nil, ErrMissingTargetPath
	}
	if target.Ref == "" {
		return nil, ErrMissingTargetRef
	}

	// Currently, cross-workspace pointers are not supported
	if target.Workspace != "" {
		return nil, ErrCrossWorkspaceNotSupported
	}

	return &target, nil
}

// CreatePointerContent creates the JSON content for a pointer file.
func CreatePointerContent(target *irminmodels.PointerTarget) ([]byte, error) {
	if target == nil {
		return nil, ErrInvalidPointerContent
	}

	// Validate required fields
	if target.Repository == "" {
		return nil, ErrMissingTargetRepository
	}
	if target.Path == "" {
		return nil, ErrMissingTargetPath
	}
	if target.Ref == "" {
		return nil, ErrMissingTargetRef
	}

	// Currently, cross-workspace pointers are not supported
	if target.Workspace != "" {
		return nil, ErrCrossWorkspaceNotSupported
	}

	content, err := json.MarshalIndent(target, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal pointer content: %w", err)
	}

	return content, nil
}

// IsPointerPath checks if the given path represents a pointer file.
// Pointer files are identified by the "_ptr." prefix in their filename.
func IsPointerPath(path string) bool {
	// Get the filename from the path
	parts := strings.Split(path, "/")
	filename := parts[len(parts)-1]

	return strings.HasPrefix(filename, PointerFilePrefix)
}

// GetPointerDisplayName extracts the display name from a pointer path.
// For a pointer like "_ptr.customers.json", returns "customers.json".
func GetPointerDisplayName(path string) string {
	// Get the filename from the path
	parts := strings.Split(path, "/")
	filename := parts[len(parts)-1]

	if strings.HasPrefix(filename, PointerFilePrefix) {
		return strings.TrimPrefix(filename, PointerFilePrefix)
	}
	return filename
}

// BuildPointerPath constructs a pointer file path from a directory and target filename.
// For example: directory="data", targetName="customers.json" -> "data/_ptr.customers.json"
func BuildPointerPath(directory, targetName string) string {
	pointerFilename := PointerFilePrefix + targetName
	if directory == "" || directory == "/" {
		return pointerFilename
	}
	// Ensure directory doesn't have trailing slash
	directory = strings.TrimSuffix(directory, "/")
	return directory + "/" + pointerFilename
}

// ExtractPointerTargetExtension extracts the file extension from a pointer path.
// For a pointer like "_ptr.customers.json", returns ".json".
func ExtractPointerTargetExtension(path string) string {
	displayName := GetPointerDisplayName(path)
	lastDot := strings.LastIndex(displayName, ".")
	if lastDot == -1 {
		return ""
	}
	return displayName[lastDot:]
}
