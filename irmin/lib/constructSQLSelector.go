package lib

import "fmt"

// ConstructSQLSelector constructs the Irmin SQL selector string.
// Format: $["workspace;repository;object@ref"]
func ConstructSQLSelector(workspaceSlug, repositorySlug, objectPath, ref string) string {
	return fmt.Sprintf(`$["%s;%s;%s@%s"]`, workspaceSlug, repositorySlug, objectPath, ref)
}
