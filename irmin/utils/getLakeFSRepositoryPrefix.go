package utils

import "fmt"

// GetLakeFSRepositoryPrefix constructs the LakeFS repository name prefix using the workspace name.
func GetLakeFSRepositoryPrefix(workspace string) string {
	return fmt.Sprintf("%s-", workspace)
}
