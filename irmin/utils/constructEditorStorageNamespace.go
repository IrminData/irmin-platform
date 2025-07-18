package utils

import "fmt"

// ConstructEditorStorageNamespace constructs the editor storage namespace.
func ConstructEditorStorageNamespace(bucket, workspaceSlug string) string {
	if bucket == "" {
		return fmt.Sprintf("s3://editor/%s", workspaceSlug)
	}
	return fmt.Sprintf("s3://%s/editor/%s", bucket, workspaceSlug)
}
