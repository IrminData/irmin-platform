package utils

import "fmt"

// ConstructLakeFSRepositoryPrefix constructs the LakeFS repository name prefix using the workspace name.
func ConstructLakeFSRepositoryPrefix(workspace string) string {
	return fmt.Sprintf("%s-", workspace)
}
