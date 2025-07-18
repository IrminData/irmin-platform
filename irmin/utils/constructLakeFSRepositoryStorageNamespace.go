package utils

import "fmt"

// ConstructLakeFSRepositoryStorageNamespace constructs the LakeFS repository storage namespace.
func ConstructLakeFSRepositoryStorageNamespace(workspace, repository string) (string, error) {
	env, err := LoadEnv()
	if err != nil {
		return "", err
	}
	if env.LakeFSS3Bucket == "" {
		return fmt.Sprintf("s3://%s/%s", workspace, repository), nil
	}
	return fmt.Sprintf("s3://%s/%s/%s", env.LakeFSS3Bucket, workspace, repository), nil
}
