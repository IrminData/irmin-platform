package utils

import "fmt"

// GetLakeFSRepositoryStorageNamespace constructs the LakeFS repository storage namespace.
func GetLakeFSRepositoryStorageNamespace(workspace, repository string) string {
	return fmt.Sprintf("s3://%s/%s", workspace, repository)
}
