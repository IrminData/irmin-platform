package lib

import (
	"errors"
	"fmt"
)

// ConstructSQLSelector constructs the Irmin SQL selector string and the S3 path selector.
// Format: $["workspace;repository;object@ref"], and the S3 path selector is "s3://workspace-slug-repository-slug/ref/object.json"
func ConstructSQLSelector(
	workspaceSlug, repositorySlug, objectPath, ref, defaultBranch string,
) (string, string, error) {
	if workspaceSlug == "" {
		return "", "", errors.New(
			"workspace slug is required to construct the SQL selector and S3 path selector",
		)
	}

	if repositorySlug == "" || objectPath == "" {
		return "", "", errors.New(
			"repository slug and object path are required to construct the SQL selector and S3 path selector",
		)
	}

	if defaultBranch == "" && ref == "" {
		return "", "", errors.New(
			"default branch and ref are required to construct the SQL selector and S3 path selector",
		)
	}

	if ref == "" {
		return fmt.Sprintf(
				`$["%s;%s;%s"]`,
				workspaceSlug,
				repositorySlug,
				objectPath,
			), fmt.Sprintf(
				"s3://%s-%s/%s/%s",
				workspaceSlug,
				repositorySlug,
				defaultBranch,
				objectPath,
			), nil
	}

	return fmt.Sprintf(
			`$["%s;%s;%s@%s"]`,
			workspaceSlug,
			repositorySlug,
			objectPath,
			ref,
		), fmt.Sprintf(
			"s3://%s-%s/%s/%s",
			workspaceSlug,
			repositorySlug,
			ref,
			objectPath,
		), nil
}
