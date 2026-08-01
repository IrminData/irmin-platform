package utils_test

import (
	"irmin-api/utils"
	"testing"
)

func TestConstructLakeFSRepositoryName(t *testing.T) {
	tests := []struct {
		name       string
		workspace  string
		repository string
		expected   string
	}{
		{
			name:       "simple names",
			workspace:  "myworkspace",
			repository: "myrepo",
			expected:   "myworkspace-myrepo",
		},
		{
			name:       "names with numbers",
			workspace:  "workspace123",
			repository: "repo456",
			expected:   "workspace123-repo456",
		},
		{
			name:       "names with hyphens",
			workspace:  "my-workspace",
			repository: "my-repo",
			expected:   "my-workspace-my-repo",
		},
		{
			name:       "names with underscores",
			workspace:  "my_workspace",
			repository: "my_repo",
			expected:   "my_workspace-my_repo",
		},
		{
			name:       "single character names",
			workspace:  "a",
			repository: "b",
			expected:   "a-b",
		},
		{
			name:       "long names",
			workspace:  "verylongworkspacename",
			repository: "verylongrepositoryname",
			expected:   "verylongworkspacename-verylongrepositoryname",
		},
		{
			name:       "empty workspace",
			workspace:  "",
			repository: "repo",
			expected:   "-repo",
		},
		{
			name:       "empty repository",
			workspace:  "workspace",
			repository: "",
			expected:   "workspace-",
		},
		{
			name:       "both empty",
			workspace:  "",
			repository: "",
			expected:   "-",
		},
		{
			name:       "workspace with dots",
			workspace:  "my.workspace",
			repository: "repo",
			expected:   "my.workspace-repo",
		},
		{
			name:       "repository with dots",
			workspace:  "workspace",
			repository: "my.repo",
			expected:   "workspace-my.repo",
		},
		{
			name:       "mixed special characters",
			workspace:  "workspace_123",
			repository: "repo-456",
			expected:   "workspace_123-repo-456",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.ConstructLakeFSRepositoryName(tt.workspace, tt.repository)
			if result != tt.expected {
				t.Errorf("ConstructLakeFSRepositoryName(%q, %q) = %q, expected %q",
					tt.workspace, tt.repository, result, tt.expected)
			}
		})
	}
}
