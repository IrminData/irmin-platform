package lib

import "fmt"

// ConstructSQLSelector constructs the Irmin SQL selector string.
// Format: $["workspace;repository;object@ref"]
func ConstructSQLSelector(workspaceSlug, repositorySlug, objectPath, ref string) string {
	if repositorySlug == "" || objectPath == "" {
		return ""
	}

	if ref == "" {
		if workspaceSlug == "" {
			return fmt.Sprintf(`$["%s;%s"]`, repositorySlug, objectPath)
		}
		return fmt.Sprintf(`$["%s;%s;%s"]`, workspaceSlug, repositorySlug, objectPath)
	}

	if workspaceSlug == "" {
		return fmt.Sprintf(`$["%s;%s@%s"]`, repositorySlug, objectPath, ref)
	}
	return fmt.Sprintf(`$["%s;%s;%s@%s"]`, workspaceSlug, repositorySlug, objectPath, ref)
}
