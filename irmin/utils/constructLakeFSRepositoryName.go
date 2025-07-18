package utils

import "fmt"

// ConstructLakeFSRepositoryName constructs the LakeFS repository name using the workspace and repository names.
func ConstructLakeFSRepositoryName(workspace, repository string) string {
	return fmt.Sprintf("%s-%s", workspace, repository)
}
