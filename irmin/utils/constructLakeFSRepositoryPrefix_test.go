package utils_test

import (
	"irmin-api/utils"
	"testing"
)

func TestConstructLakeFSRepositoryPrefix(t *testing.T) {
	tests := []struct {
		name      string
		workspace string
		expected  string
	}{
		{
			name:      "simple workspace name",
			workspace: "myworkspace",
			expected:  "myworkspace-",
		},
		{
			name:      "workspace with numbers",
			workspace: "workspace123",
			expected:  "workspace123-",
		},
		{
			name:      "workspace with hyphens",
			workspace: "my-workspace",
			expected:  "my-workspace-",
		},
		{
			name:      "workspace with underscores",
			workspace: "my_workspace",
			expected:  "my_workspace-",
		},
		{
			name:      "single character",
			workspace: "a",
			expected:  "a-",
		},
		{
			name:      "long workspace name",
			workspace: "verylongworkspacename",
			expected:  "verylongworkspacename-",
		},
		{
			name:      "empty workspace",
			workspace: "",
			expected:  "-",
		},
		{
			name:      "workspace with dots",
			workspace: "my.workspace",
			expected:  "my.workspace-",
		},
		{
			name:      "workspace with mixed special characters",
			workspace: "workspace_123.test",
			expected:  "workspace_123.test-",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.ConstructLakeFSRepositoryPrefix(tt.workspace)
			if result != tt.expected {
				t.Errorf("ConstructLakeFSRepositoryPrefix(%q) = %q, expected %q",
					tt.workspace, result, tt.expected)
			}
		})
	}
}
