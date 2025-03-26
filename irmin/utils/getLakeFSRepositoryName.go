package utils

import "fmt"

// GetLakeFSRepositoryName constructs the LakeFS repository name using the workspace and repository names.
func GetLakeFSRepositoryName(workspace, repository string) string {
	return fmt.Sprintf("%s-%s", workspace, repository)
}
