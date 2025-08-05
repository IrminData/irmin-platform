package utils

import "fmt"

// ConstructEditorStorageNamespace constructs the editor storage namespace.
func ConstructEditorStorageNamespace(workspaceSlug string) string {
	return fmt.Sprintf("s3://editor/%s", workspaceSlug)
}
