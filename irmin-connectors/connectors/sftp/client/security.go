package sftpclient

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

const (
	// MaxFileSize is the maximum allowed file size (1GB).
	MaxFileSize = 1024 * 1024 * 1024 // 1GB max file size
	// MaxTotalSize is the maximum total transfer size (5GB).
	MaxTotalSize = 5 * 1024 * 1024 * 1024 // 5GB max total transfer size
	// MaxFilesPerTransfer is the maximum files per transfer.
	MaxFilesPerTransfer = 1000 // Maximum files per transfer
	// MaxPathLength is the maximum path length.
	MaxPathLength = 4096 // Maximum path length
	// MaxDirectoryDepth is the maximum directory nesting depth.
	MaxDirectoryDepth = 32 // Maximum directory nesting depth
)

// SecurityConfig holds security configuration for SFTP operations.
type SecurityConfig struct {
	MaxFileSize         int64
	MaxTotalSize        int64
	MaxFilesPerTransfer int
	MaxPathLength       int
	MaxDirectoryDepth   int
	AllowedExtensions   []string
	BlockedExtensions   []string
	AllowPathTraversal  bool
}

// DefaultSecurityConfig returns default security configuration.
func DefaultSecurityConfig() *SecurityConfig {
	return &SecurityConfig{
		MaxFileSize:         MaxFileSize,
		MaxTotalSize:        MaxTotalSize,
		MaxFilesPerTransfer: MaxFilesPerTransfer,
		MaxPathLength:       MaxPathLength,
		MaxDirectoryDepth:   MaxDirectoryDepth,
		AllowedExtensions:   []string{}, // Empty means allow all
		BlockedExtensions: []string{
			".exe", ".bat", ".cmd", ".com", ".scr", ".vbs", ".js",
			".jar", ".app", ".deb", ".rpm", ".dmg", ".pkg",
		},
		AllowPathTraversal: false,
	}
}

// ValidatePath validates a file path for security issues.
func (sc *SecurityConfig) ValidatePath(path string) error {
	if path == "" {
		return errors.New("path cannot be empty")
	}

	// Check path length
	if len(path) > sc.MaxPathLength {
		return fmt.Errorf("path too long: %d characters (max %d)", len(path), sc.MaxPathLength)
	}

	// Normalize path
	cleanPath := filepath.Clean(path)

	// Check for path traversal attacks
	if !sc.AllowPathTraversal {
		// Check if the cleaned path contains ".." which indicates traversal
		if strings.Contains(path, "..") {
			return fmt.Errorf("path traversal detected: %s", path)
		}

		// Check if cleaning the path changes it significantly (indicates traversal)
		if cleanPath != path && strings.Contains(path, "..") {
			return fmt.Errorf("path traversal detected: %s", path)
		}
	}

	// Check for null bytes
	if strings.Contains(path, "\x00") {
		return fmt.Errorf("null byte detected in path: %s", path)
	}

	// Check directory depth
	depth := strings.Count(cleanPath, "/")
	if depth > sc.MaxDirectoryDepth {
		return fmt.Errorf("path too deep: %d levels (max %d)", depth, sc.MaxDirectoryDepth)
	}

	return nil
}

// ValidateFileName validates a filename for security issues.
func (sc *SecurityConfig) ValidateFileName(filename string) error {
	if filename == "" {
		return errors.New("filename cannot be empty")
	}

	if err := sc.validateForbiddenNames(filename); err != nil {
		return err
	}

	if err := sc.validateInvalidCharacters(filename); err != nil {
		return err
	}

	if err := sc.validateFileExtensions(filename); err != nil {
		return err
	}

	return nil
}

// validateForbiddenNames checks for special forbidden filenames.
func (sc *SecurityConfig) validateForbiddenNames(filename string) error {
	forbiddenNames := []string{
		".", "..", "CON", "PRN", "AUX", "NUL",
		"COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
		"LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
	}

	upperName := strings.ToUpper(filename)
	for _, forbidden := range forbiddenNames {
		if upperName == forbidden {
			return fmt.Errorf("forbidden filename: %s", filename)
		}
	}
	return nil
}

// validateInvalidCharacters checks for invalid characters in filename.
func (sc *SecurityConfig) validateInvalidCharacters(filename string) error {
	invalidChars := []string{"<", ">", ":", "\"", "|", "?", "*", "\x00"}
	for _, char := range invalidChars {
		if strings.Contains(filename, char) {
			return fmt.Errorf("invalid character in filename: %s", char)
		}
	}
	return nil
}

// validateFileExtensions checks allowed and blocked file extensions.
func (sc *SecurityConfig) validateFileExtensions(filename string) error {
	ext := strings.ToLower(filepath.Ext(filename))

	// Check file extension if restrictions are configured
	if len(sc.AllowedExtensions) > 0 {
		allowed := false
		for _, allowedExt := range sc.AllowedExtensions {
			if ext == strings.ToLower(allowedExt) {
				allowed = true
				break
			}
		}
		if !allowed {
			return fmt.Errorf("file extension not allowed: %s", ext)
		}
	}

	// Check for blocked extensions
	if len(sc.BlockedExtensions) > 0 {
		for _, blockedExt := range sc.BlockedExtensions {
			if ext == strings.ToLower(blockedExt) {
				return fmt.Errorf("file extension blocked: %s", ext)
			}
		}
	}

	return nil
}

// ValidateFileSize validates file size against limits.
func (sc *SecurityConfig) ValidateFileSize(size int64) error {
	if size < 0 {
		return fmt.Errorf("invalid file size: %d", size)
	}

	if size > sc.MaxFileSize {
		return fmt.Errorf("file too large: %d bytes (max %d)", size, sc.MaxFileSize)
	}

	return nil
}

// ValidateTransferSize validates total transfer size.
func (sc *SecurityConfig) ValidateTransferSize(totalSize int64, fileCount int) error {
	if totalSize > sc.MaxTotalSize {
		return fmt.Errorf("transfer too large: %d bytes (max %d)", totalSize, sc.MaxTotalSize)
	}

	if fileCount > sc.MaxFilesPerTransfer {
		return fmt.Errorf("too many files: %d files (max %d)", fileCount, sc.MaxFilesPerTransfer)
	}

	return nil
}

// SanitizePath sanitizes a file path by removing dangerous elements.
func SanitizePath(path string) string {
	// Handle empty path
	if path == "" {
		return "/"
	}

	// Clean the path
	cleaned := filepath.Clean(path)

	// Remove any null bytes
	cleaned = strings.ReplaceAll(cleaned, "\x00", "")

	// Handle special case where Clean returns "."
	if cleaned == "." {
		return "/"
	}

	// Ensure it starts with /
	if !strings.HasPrefix(cleaned, "/") {
		cleaned = "/" + cleaned
	}

	// Remove any remaining path traversal attempts
	cleaned = strings.ReplaceAll(cleaned, "../", "")
	cleaned = strings.ReplaceAll(cleaned, "..\\", "")

	return cleaned
}

// IsTextFile determines if a file is likely a text file based on its extension.
func IsTextFile(filename string) bool {
	textExtensions := map[string]bool{
		".txt": true, ".md": true, ".json": true, ".xml": true,
		".yml": true, ".yaml": true, ".csv": true, ".log": true,
		".conf": true, ".config": true, ".ini": true, ".properties": true,
		".sql": true, ".js": true, ".ts": true, ".css": true, ".html": true,
		".htm": true, ".py": true, ".go": true, ".java": true,
		".cpp": true, ".c": true, ".h": true, ".sh": true, ".bash": true,
		".ps1": true, ".php": true, ".rb": true, ".pl": true, ".r": true,
	}

	ext := strings.ToLower(filepath.Ext(filename))
	return textExtensions[ext]
}

// FormatFileSize formats file size in human-readable format.
func FormatFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}

	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}

	units := []string{"KB", "MB", "GB", "TB", "PB"}
	if exp >= len(units) {
		exp = len(units) - 1
	}

	return fmt.Sprintf("%.1f %s", float64(bytes)/float64(div), units[exp])
}
