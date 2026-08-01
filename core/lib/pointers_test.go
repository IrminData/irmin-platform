package lib_test

import (
	"encoding/json"
	"errors"
	"irmin-api/lib"
	"strings"
	"testing"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/zeebo/assert"
)

func TestParsePointerFile(t *testing.T) {
	tests := []struct {
		name        string
		content     []byte
		expected    *irminmodels.PointerTarget
		expectError error
	}{
		{
			name: "valid pointer file",
			content: []byte(`{
				"target_repository": "my-repo",
				"target_path": "data/file.csv",
				"target_ref": "main"
			}`),
			expected: &irminmodels.PointerTarget{
				Repository: "my-repo",
				Path:       "data/file.csv",
				Ref:        "main",
			},
			expectError: nil,
		},
		{
			name:        "empty content",
			content:     []byte{},
			expected:    nil,
			expectError: lib.ErrInvalidPointerContent,
		},
		{
			name:        "nil content",
			content:     nil,
			expected:    nil,
			expectError: lib.ErrInvalidPointerContent,
		},
		{
			name:        "invalid JSON",
			content:     []byte(`{invalid json`),
			expected:    nil,
			expectError: lib.ErrInvalidPointerContent,
		},
		{
			name: "missing repository",
			content: []byte(`{
				"target_path": "data/file.csv",
				"target_ref": "main"
			}`),
			expected:    nil,
			expectError: lib.ErrMissingTargetRepository,
		},
		{
			name: "missing path",
			content: []byte(`{
				"target_repository": "my-repo",
				"target_ref": "main"
			}`),
			expected:    nil,
			expectError: lib.ErrMissingTargetPath,
		},
		{
			name: "missing ref",
			content: []byte(`{
				"target_repository": "my-repo",
				"target_path": "data/file.csv"
			}`),
			expected:    nil,
			expectError: lib.ErrMissingTargetRef,
		},
		{
			name: "cross-workspace pointer",
			content: []byte(`{
				"target_workspace": "other-workspace",
				"target_repository": "my-repo",
				"target_path": "data/file.csv",
				"target_ref": "main"
			}`),
			expected:    nil,
			expectError: lib.ErrCrossWorkspaceNotSupported,
		},
		{
			name: "empty repository",
			content: []byte(`{
				"target_repository": "",
				"target_path": "data/file.csv",
				"target_ref": "main"
			}`),
			expected:    nil,
			expectError: lib.ErrMissingTargetRepository,
		},
		{
			name: "empty path",
			content: []byte(`{
				"target_repository": "my-repo",
				"target_path": "",
				"target_ref": "main"
			}`),
			expected:    nil,
			expectError: lib.ErrMissingTargetPath,
		},
		{
			name: "empty ref",
			content: []byte(`{
				"target_repository": "my-repo",
				"target_path": "data/file.csv",
				"target_ref": ""
			}`),
			expected:    nil,
			expectError: lib.ErrMissingTargetRef,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := lib.ParsePointerFile(tt.content)

			if tt.expectError != nil {
				if err == nil {
					t.Errorf("ParsePointerFile() expected error %v, got nil", tt.expectError)
					return
				}
				if !errors.Is(err, tt.expectError) && err.Error() != tt.expectError.Error() {
					t.Errorf("ParsePointerFile() error = %v, expected %v", err, tt.expectError)
				}
				return
			}

			if err != nil {
				t.Errorf("ParsePointerFile() unexpected error: %v", err)
				return
			}
			if result == nil {
				t.Fatal("ParsePointerFile() returned nil result")
			}
			assert.Equal(t, result.Repository, tt.expected.Repository)
			assert.Equal(t, result.Path, tt.expected.Path)
			assert.Equal(t, result.Ref, tt.expected.Ref)
		})
	}
}

func TestCreatePointerContent_Valid(t *testing.T) {
	target := &irminmodels.PointerTarget{
		Repository: "my-repo",
		Path:       "data/file.csv",
		Ref:        "main",
	}

	result, err := lib.CreatePointerContent(target)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Verify we can parse the created content back
	var parsed irminmodels.PointerTarget
	unmarshalErr := json.Unmarshal(result, &parsed)
	assert.NoError(t, unmarshalErr)

	assert.Equal(t, parsed.Repository, target.Repository)
	assert.Equal(t, parsed.Path, target.Path)
	assert.Equal(t, parsed.Ref, target.Ref)
}

func TestCreatePointerContent_Errors(t *testing.T) {
	tests := []struct {
		name        string
		target      *irminmodels.PointerTarget
		expectError error
	}{
		{
			name:        "nil target",
			target:      nil,
			expectError: lib.ErrInvalidPointerContent,
		},
		{
			name: "missing repository",
			target: &irminmodels.PointerTarget{
				Path: "data/file.csv",
				Ref:  "main",
			},
			expectError: lib.ErrMissingTargetRepository,
		},
		{
			name: "missing path",
			target: &irminmodels.PointerTarget{
				Repository: "my-repo",
				Ref:        "main",
			},
			expectError: lib.ErrMissingTargetPath,
		},
		{
			name: "missing ref",
			target: &irminmodels.PointerTarget{
				Repository: "my-repo",
				Path:       "data/file.csv",
			},
			expectError: lib.ErrMissingTargetRef,
		},
		{
			name: "cross-workspace pointer",
			target: &irminmodels.PointerTarget{
				Workspace:  "other-workspace",
				Repository: "my-repo",
				Path:       "data/file.csv",
				Ref:        "main",
			},
			expectError: lib.ErrCrossWorkspaceNotSupported,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := lib.CreatePointerContent(tt.target)
			assert.Error(t, err)
			if !errors.Is(err, tt.expectError) && !strings.Contains(err.Error(), tt.expectError.Error()) {
				t.Errorf("CreatePointerContent() error = %v, expected %v", err, tt.expectError)
			}
		})
	}
}

func TestIsPointerPath(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{
			name:     "pointer file at root",
			path:     "_ptr.customers.json",
			expected: true,
		},
		{
			name:     "pointer file in subdirectory",
			path:     "data/_ptr.customers.json",
			expected: true,
		},
		{
			name:     "pointer file in deep subdirectory",
			path:     "data/staging/v2/_ptr.customers.json",
			expected: true,
		},
		{
			name:     "regular file at root",
			path:     "customers.json",
			expected: false,
		},
		{
			name:     "regular file in subdirectory",
			path:     "data/customers.json",
			expected: false,
		},
		{
			name:     "file with _ptr in middle",
			path:     "data/customers_ptr.json",
			expected: false,
		},
		{
			name:     "file with _ptr at end",
			path:     "data/customers.json_ptr",
			expected: false,
		},
		{
			name:     "pointer file without extension",
			path:     "_ptr.customers",
			expected: true,
		},
		{
			name:     "pointer file with multiple dots",
			path:     "_ptr.customers.v2.json",
			expected: true,
		},
		{
			name:     "empty path",
			path:     "",
			expected: false,
		},
		{
			name:     "just slash",
			path:     "/",
			expected: false,
		},
		{
			name:     "directory with pointer prefix",
			path:     "_ptr.folder/file.json",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := lib.IsPointerPath(tt.path)
			if result != tt.expected {
				t.Errorf("IsPointerPath(%q) = %v, expected %v", tt.path, result, tt.expected)
			}
		})
	}
}

func TestGetPointerDisplayName(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{
			name:     "pointer file at root",
			path:     "_ptr.customers.json",
			expected: "customers.json",
		},
		{
			name:     "pointer file in subdirectory",
			path:     "data/_ptr.customers.json",
			expected: "customers.json",
		},
		{
			name:     "pointer file in deep subdirectory",
			path:     "data/staging/v2/_ptr.customers.json",
			expected: "customers.json",
		},
		{
			name:     "regular file at root",
			path:     "customers.json",
			expected: "customers.json",
		},
		{
			name:     "regular file in subdirectory",
			path:     "data/customers.json",
			expected: "customers.json",
		},
		{
			name:     "pointer file without extension",
			path:     "_ptr.customers",
			expected: "customers",
		},
		{
			name:     "pointer file with multiple dots",
			path:     "_ptr.customers.v2.json",
			expected: "customers.v2.json",
		},
		{
			name:     "empty path",
			path:     "",
			expected: "",
		},
		{
			name:     "just slash",
			path:     "/",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := lib.GetPointerDisplayName(tt.path)
			if result != tt.expected {
				t.Errorf("GetPointerDisplayName(%q) = %q, expected %q", tt.path, result, tt.expected)
			}
		})
	}
}

func TestBuildPointerPath(t *testing.T) {
	tests := []struct {
		name       string
		directory  string
		targetName string
		expected   string
	}{
		{
			name:       "root directory",
			directory:  "",
			targetName: "customers.json",
			expected:   "_ptr.customers.json",
		},
		{
			name:       "root directory with slash",
			directory:  "/",
			targetName: "customers.json",
			expected:   "_ptr.customers.json",
		},
		{
			name:       "simple subdirectory",
			directory:  "data",
			targetName: "customers.json",
			expected:   "data/_ptr.customers.json",
		},
		{
			name:       "subdirectory with trailing slash",
			directory:  "data/",
			targetName: "customers.json",
			expected:   "data/_ptr.customers.json",
		},
		{
			name:       "deep subdirectory",
			directory:  "data/staging/v2",
			targetName: "customers.json",
			expected:   "data/staging/v2/_ptr.customers.json",
		},
		{
			name:       "deep subdirectory with trailing slash",
			directory:  "data/staging/v2/",
			targetName: "customers.json",
			expected:   "data/staging/v2/_ptr.customers.json",
		},
		{
			name:       "target without extension",
			directory:  "data",
			targetName: "customers",
			expected:   "data/_ptr.customers",
		},
		{
			name:       "target with multiple dots",
			directory:  "data",
			targetName: "customers.v2.json",
			expected:   "data/_ptr.customers.v2.json",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := lib.BuildPointerPath(tt.directory, tt.targetName)
			if result != tt.expected {
				t.Errorf("BuildPointerPath(%q, %q) = %q, expected %q",
					tt.directory, tt.targetName, result, tt.expected)
			}
		})
	}
}

func TestExtractPointerTargetExtension(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{
			name:     "pointer file with json extension",
			path:     "_ptr.customers.json",
			expected: ".json",
		},
		{
			name:     "pointer file with csv extension",
			path:     "_ptr.data.csv",
			expected: ".csv",
		},
		{
			name:     "pointer file without extension",
			path:     "_ptr.customers",
			expected: "",
		},
		{
			name:     "pointer file with multiple dots",
			path:     "_ptr.customers.v2.json",
			expected: ".json",
		},
		{
			name:     "pointer file in subdirectory",
			path:     "data/_ptr.customers.json",
			expected: ".json",
		},
		{
			name:     "regular file with extension",
			path:     "customers.json",
			expected: ".json",
		},
		{
			name:     "regular file without extension",
			path:     "customers",
			expected: "",
		},
		{
			name:     "empty path",
			path:     "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := lib.ExtractPointerTargetExtension(tt.path)
			if result != tt.expected {
				t.Errorf("ExtractPointerTargetExtension(%q) = %q, expected %q", tt.path, result, tt.expected)
			}
		})
	}
}

func TestPointerRoundTrip(t *testing.T) {
	// Test that we can create pointer content and parse it back
	target := &irminmodels.PointerTarget{
		Repository: "my-repo",
		Path:       "data/customers.json",
		Ref:        "main",
	}

	// Create content
	content, err := lib.CreatePointerContent(target)
	if err != nil {
		t.Fatalf("CreatePointerContent() error = %v", err)
	}

	// Parse content back
	parsed, err := lib.ParsePointerFile(content)
	if err != nil {
		t.Fatalf("ParsePointerFile() error = %v", err)
	}

	// Verify all fields match
	assert.Equal(t, parsed.Repository, target.Repository)
	assert.Equal(t, parsed.Path, target.Path)
	assert.Equal(t, parsed.Ref, target.Ref)
	assert.Equal(t, parsed.Workspace, target.Workspace)
}
