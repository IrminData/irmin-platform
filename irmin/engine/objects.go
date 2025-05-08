package engine

import (
	"fmt"
	"io"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// getObject fetches the object from a workspace repository at a specific ref and path
// and returns it as an Irmin formatted object.
func getObject(
	path, lakeFSRepositoryName, ref string,
	lakefsClient lakefs.Client,
) (*irminmodels.Object, error) {
	// Trim leading and trailing slashes from the path.
	path = strings.Trim(path, "/")

	// Parse object details (name, full path, type, content type).
	objectPathDetails := utils.ParseObjectDetailsFromPath(path)

	// Retrieve metadata for file objects; for groups, default metadata stays empty.
	objectMetadata := &lakefs.ObjectMetadata{
		Path:                  path,
		PathType:              lakefs.PathTypeObject,
		PhysicalAddress:       "",
		PhysicalAddressExpiry: nil,
		Checksum:              "",
		SizeBytes:             0,
		Mtime:                 0,
		Metadata:              nil,
		ContentType:           "",
	}
	var err error
	if objectPathDetails.Type != irminmodels.ObjectTypeGroup {
		objectMetadata, err = lakefsClient.GetObjectMetadata(
			lakeFSRepositoryName, ref, path, true, false,
		)
		if err != nil {
			return nil, err
		}
	}

	// If it's a group, list all objects under the path (recursive), then identify immediate children and sub-groups.
	var rawChildren []lakefs.ObjectMetadata
	if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
		rawChildren, err = lakefsClient.ListAllObjects(lakeFSRepositoryName, ref, path, "", "", true, false)
		if err != nil {
			return nil, err
		}
	}

	// Map immediate files and directories under this path.
	files := make(map[string]lakefs.ObjectMetadata)
	dirs := make(map[string]struct{})
	for _, child := range rawChildren {
		// Determine path relative to current prefix
		rel := child.Path
		if path != "" {
			rel = strings.TrimPrefix(child.Path, path+"/")
		}
		// Split into immediate component
		parts := strings.SplitN(rel, "/", 2)
		name := parts[0]
		if len(parts) > 1 {
			// It's part of a sub-directory
			dirs[name] = struct{}{}
		} else {
			// Immediate file
			files[name] = child
		}
	}

	// Convert immediate children: recurse on directories first, then files.
	var irminObjectChildren []irminmodels.Object
	for dir := range dirs {
		subPath := dir
		if path != "" {
			subPath = path + "/" + dir
		}
		// Recursively fetch directory as group
		nestedObj, err := getObject(
			subPath,
			lakeFSRepositoryName,
			ref,
			lakefsClient,
		)
		if err != nil {
			return nil, err
		}
		irminObjectChildren = append(irminObjectChildren, *nestedObj)
	}
	for name, meta := range files {
		// Leaf object: convert metadata to Irmin object.
		objectDetails := utils.ParseObjectDetailsFromPath(meta.Path)
		lastModified := time.Unix(meta.Mtime, 0).Format(time.RFC3339)
		irminObjectChildren = append(irminObjectChildren, irminmodels.Object{
			Name:                  name,
			Path:                  objectDetails.FullPath,
			Type:                  objectDetails.Type,
			ContentType:           objectDetails.ContentType,
			PhysicalAddress:       meta.PhysicalAddress,
			PhysicalAddressExpiry: meta.PhysicalAddressExpiry,
			SizeBytes:             meta.SizeBytes,
			LastModified:          lastModified,
			Metadata:              meta.Metadata,
		})
	}

	// Determine last modified time for the current object if it's a file.
	var lastModified string
	if objectMetadata != nil && objectPathDetails.Type != irminmodels.ObjectTypeGroup {
		lastModified = time.Unix(objectMetadata.Mtime, 0).Format(time.RFC3339)
	}

	// Construct and return the Irmin object with all nested children.
	irminObject := irminmodels.Object{
		Name:                  objectPathDetails.Name,
		Path:                  objectPathDetails.FullPath,
		Type:                  objectPathDetails.Type,
		ContentType:           objectPathDetails.ContentType,
		PhysicalAddress:       objectMetadata.PhysicalAddress,
		PhysicalAddressExpiry: objectMetadata.PhysicalAddressExpiry,
		SizeBytes:             objectMetadata.SizeBytes,
		LastModified:          lastModified,
		Metadata:              objectMetadata.Metadata,
		Children:              irminObjectChildren,
	}

	return &irminObject, nil
}

func (c *Client) GetPath(workspace, repository, path, ref string) (*irminmodels.Object, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Fetch the object metadata from the repository.
	irminObject, err := getObject(path, lakeFSRepositoryName, ref, *c.LakeFSClient)
	if err != nil {
		return nil, fmt.Errorf("failed to get object: %w", err)
	}

	return irminObject, nil
}

func (c *Client) GetObjectContent(workspace, repository, path, ref string) ([]byte, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Fetch the content of the object.
	content, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, ref, path)
	if err != nil {
		return nil, fmt.Errorf("failed to get object content: %w", err)
	}

	return content, nil
}

func (c *Client) UploadObject(workspace, repository, path, ref string, file io.Reader) (*irminmodels.Object, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Format the object path.
	path = strings.Trim(path, "/")

	// Upload the object to the repository using received file.
	objectMetadata, err := c.LakeFSClient.UploadObject(lakeFSRepositoryName, ref, path, file, false)
	if err != nil {
		return nil, fmt.Errorf("failed to upload object: %w", err)
	}

	// Parse the object details from the path.
	objectPathDetails := utils.ParseObjectDetailsFromPath(path)

	// Construct the resulting object
	lastModified := time.Unix(objectMetadata.Mtime, 0).Format(time.RFC3339)
	irminObject := irminmodels.Object{
		Name:                  objectPathDetails.Name,
		Path:                  objectPathDetails.FullPath,
		Type:                  objectPathDetails.Type,
		ContentType:           objectPathDetails.ContentType,
		PhysicalAddress:       objectMetadata.PhysicalAddress,
		PhysicalAddressExpiry: objectMetadata.PhysicalAddressExpiry,
		SizeBytes:             objectMetadata.SizeBytes,
		LastModified:          lastModified,
		Metadata:              objectMetadata.Metadata,
	}

	return &irminObject, nil
}

func (c *Client) DeleteObject(workspace, repository, path, ref string) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Format the object path.
	path = strings.Trim(path, "/")

	// Delete the object from the repository.
	err := c.LakeFSClient.DeleteObject(lakeFSRepositoryName, ref, path, false)
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	return nil
}

func (c *Client) MoveObject(workspace, repository, path, ref, newPath string) (*irminmodels.Object, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Format the object paths.
	path = strings.Trim(path, "/")
	newPath = strings.Trim(newPath, "/")

	// Copy the object in the repository to the new path.
	objectMetadata, err := c.LakeFSClient.CopyObject(lakeFSRepositoryName, ref, newPath, lakefs.ObjectCopyRequest{
		SrcPath: path,
		SrcRef:  ref,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to copy object: %w", err)
	}

	// Delete the original object from the repository.
	err = c.LakeFSClient.DeleteObject(lakeFSRepositoryName, ref, path, false)
	if err != nil {
		return nil, fmt.Errorf("failed to delete object: %w", err)
	}

	// Parse the object details from the path.
	objectPathDetails := utils.ParseObjectDetailsFromPath(newPath)

	// Construct the resulting object
	lastModified := time.Unix(objectMetadata.Mtime, 0).Format(time.RFC3339)
	irminObject := irminmodels.Object{
		Name:                  objectPathDetails.Name,
		Path:                  objectPathDetails.FullPath,
		Type:                  objectPathDetails.Type,
		ContentType:           objectPathDetails.ContentType,
		PhysicalAddress:       objectMetadata.PhysicalAddress,
		PhysicalAddressExpiry: objectMetadata.PhysicalAddressExpiry,
		SizeBytes:             objectMetadata.SizeBytes,
		LastModified:          lastModified,
		Metadata:              objectMetadata.Metadata,
	}

	return &irminObject, nil
}

func (c *Client) CopyObject(workspace, repository, path, ref, newPath string) (*irminmodels.Object, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Format the object paths.
	path = strings.Trim(path, "/")
	newPath = strings.Trim(newPath, "/")

	// Copy the object in the repository to the new path.
	objectMetadata, err := c.LakeFSClient.CopyObject(lakeFSRepositoryName, ref, newPath, lakefs.ObjectCopyRequest{
		SrcPath: path,
		SrcRef:  ref,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to copy object: %w", err)
	}

	// Parse the object details from the path.
	objectPathDetails := utils.ParseObjectDetailsFromPath(newPath)

	// Construct the resulting object
	lastModified := time.Unix(objectMetadata.Mtime, 0).Format(time.RFC3339)
	irminObject := irminmodels.Object{
		Name:                  objectPathDetails.Name,
		Path:                  objectPathDetails.FullPath,
		Type:                  objectPathDetails.Type,
		ContentType:           objectPathDetails.ContentType,
		PhysicalAddress:       objectMetadata.PhysicalAddress,
		PhysicalAddressExpiry: objectMetadata.PhysicalAddressExpiry,
		SizeBytes:             objectMetadata.SizeBytes,
		LastModified:          lastModified,
		Metadata:              objectMetadata.Metadata,
	}

	return &irminObject, nil
}

func (c *Client) GetObjectChanges(workspace, repository, path, ref string) ([]irminmodels.Commit, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Parse the object details from the path.
	objectPathDetails := utils.ParseObjectDetailsFromPath(path)

	// Fetch commits
	var lakefsCommits []lakefs.Commit
	var err error
	if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
		// If object is a group - treat it as a prefix when fetching the commit list
		lakefsCommits, err = c.LakeFSClient.ListAllCommits(lakeFSRepositoryName, ref, "", "", "", nil, []string{
			objectPathDetails.FullPath,
		})
	} else {
		// If object is not a group - treat it as an object
		lakefsCommits, err = c.LakeFSClient.ListAllCommits(lakeFSRepositoryName, ref, "", "", "", []string{
			objectPathDetails.FullPath,
		}, nil)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get commits: %w", err)
	}

	// Convert LakeFS commits to Irmin commits.
	irminCommits := make([]irminmodels.Commit, len(lakefsCommits))
	for i, lakeFSCommit := range lakefsCommits {
		previousHash := ""
		if len(lakeFSCommit.Parents) > 0 {
			previousHash = lakeFSCommit.Parents[0]
		}
		author := lakeFSCommit.Committer
		if authorValue, ok := lakeFSCommit.Metadata["author"]; ok && authorValue != "" {
			author = authorValue
		}
		irminCommits[i] = irminmodels.Commit{
			Hash:         lakeFSCommit.ID,
			Message:      lakeFSCommit.Message,
			Timestamp:    time.Unix(int64(lakeFSCommit.CreationDate), 0).Format(time.RFC3339),
			Author:       author,
			PreviousHash: &previousHash,
		}
	}

	return irminCommits, nil
}
