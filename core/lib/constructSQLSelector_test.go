package lib_test

import (
	"irmin-api/lib"
	"testing"

	"github.com/zeebo/assert"
)

func TestConstructSQLSelector(t *testing.T) {
	tests := []struct {
		name           string
		workspaceSlug  string
		repoSlug       string
		objectPath     string
		ref            string
		defaultBranch  string
		expectedSQL    string
		expectedS3Path string
		expectError    bool
	}{
		{
			name:           "simple file",
			workspaceSlug:  "ws",
			repoSlug:       "repo",
			objectPath:     "file.json",
			ref:            "main",
			defaultBranch:  "main",
			expectedSQL:    `$["ws;repo;file.json@main"]`,
			expectedS3Path: "s3://ws-repo/main/file.json",
			expectError:    false,
		},
		{
			name:           "nested file",
			workspaceSlug:  "ws",
			repoSlug:       "repo",
			objectPath:     "path/to/file.csv",
			ref:            "dev",
			defaultBranch:  "main",
			expectedSQL:    `$["ws;repo;path/to/file.csv@dev"]`,
			expectedS3Path: "s3://ws-repo/dev/path/to/file.csv",
			expectError:    false,
		},
		{
			name:           "group object (folder)",
			workspaceSlug:  "my-workspace",
			repoSlug:       "demo-data",
			objectPath:     "orders/archive",
			ref:            "v1",
			defaultBranch:  "main",
			expectedSQL:    `$["my-workspace;demo-data;orders/archive@v1"]`,
			expectedS3Path: "s3://my-workspace-demo-data/v1/orders/archive",
			expectError:    false,
		},
		{
			name:           "deeply nested group object",
			workspaceSlug:  "ws",
			repoSlug:       "repo",
			objectPath:     "a/b/c/d",
			ref:            "main",
			defaultBranch:  "main",
			expectedSQL:    `$["ws;repo;a/b/c/d@main"]`,
			expectedS3Path: "s3://ws-repo/main/a/b/c/d",
			expectError:    false,
		},
		{
			name:           "with empty ref uses defaultBranch",
			workspaceSlug:  "ws",
			repoSlug:       "repo",
			objectPath:     "file.json",
			ref:            "",
			defaultBranch:  "main",
			expectedSQL:    `$["ws;repo;file.json"]`,
			expectedS3Path: "s3://ws-repo/main/file.json",
			expectError:    false,
		},
		{
			name:           "without workspace slug",
			workspaceSlug:  "",
			repoSlug:       "repo",
			objectPath:     "file.json",
			ref:            "main",
			defaultBranch:  "main",
			expectedSQL:    "",
			expectedS3Path: "",
			expectError:    true,
		},
		{
			name:           "missing repository slug",
			workspaceSlug:  "ws",
			repoSlug:       "",
			objectPath:     "file.json",
			ref:            "main",
			defaultBranch:  "main",
			expectedSQL:    "",
			expectedS3Path: "",
			expectError:    true,
		},
		{
			name:           "missing object path",
			workspaceSlug:  "ws",
			repoSlug:       "repo",
			objectPath:     "",
			ref:            "main",
			defaultBranch:  "main",
			expectedSQL:    "",
			expectedS3Path: "",
			expectError:    true,
		},
		{
			name:           "missing both ref and defaultBranch",
			workspaceSlug:  "ws",
			repoSlug:       "repo",
			objectPath:     "file.json",
			ref:            "",
			defaultBranch:  "",
			expectedSQL:    "",
			expectedS3Path: "",
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sqlSelector, s3Path, err := lib.ConstructSQLSelector(
				tt.workspaceSlug,
				tt.repoSlug,
				tt.objectPath,
				tt.ref,
				tt.defaultBranch,
			)

			if tt.expectError {
				assert.Error(t, err)
				assert.Equal(t, "", sqlSelector)
				assert.Equal(t, "", s3Path)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedSQL, sqlSelector)
				assert.Equal(t, tt.expectedS3Path, s3Path)
			}
		})
	}
}
