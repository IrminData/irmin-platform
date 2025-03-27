package engine

import (
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"mime/multipart"
	"strings"
	"time"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// getObject fetches the object from a workspace repository at a specific ref and path
// and returns it as an Irmin formatted object.
func getObject(path, lakeFSRepositoryName, ref string, lakefsClient lakefs.Client) (*irminModels.Object, error) {
	// Format the object path.
	path = strings.Trim(path, "/")

	// Parse the object details from the path.
	objectPathDetails := utils.ParseObjectDetailsFromPath(path)

	// Get details about the object if it's not a group.
	var objectMetadata *lakefs.ObjectMetadata
	var err error
	if objectPathDetails.Type != irminModels.ObjectTypeGroup {
		objectMetadata, err = lakefsClient.GetObjectMetadata(lakeFSRepositoryName, ref, path, true, false)
	}
	if err != nil {
		return nil, err
	}

	// If the object is a group, list its children.
	var children []lakefs.ObjectMetadata
	if objectPathDetails.Type == irminModels.ObjectTypeGroup {
		children, err = lakefsClient.ListAllObjects(lakeFSRepositoryName, ref, path, "", "", true, false)
	}
	if err != nil {
		return nil, err
	}

	// Convert LakeFS objects to Irmin objects.
	var irminObjectChildren []irminModels.Object
	for _, child := range children {
		objectDetails := utils.ParseObjectDetailsFromPath(child.Path)
		lastModified := time.Unix(int64(child.Mtime), 0).Format(time.RFC3339)
		irminObjectChildren = append(irminObjectChildren, irminModels.Object{
			Name:                  objectDetails.Name,
			Path:                  objectDetails.FullPath,
			Type:                  objectDetails.Type,
			ContentType:           objectDetails.ContentType,
			PhysicalAddress:       child.PhysicalAddress,
			PhysicalAddressExpiry: child.PhysicalAddressExpiry,
			SizeBytes:             child.SizeBytes,
			LastModified:          lastModified,
			Metadata:              child.Metadata,
		})
	}

	// Construct the resulting object
	lastModified := ""
	if objectMetadata == nil {
		// It's a group, thus it has no metadata
		objectMetadata = &lakefs.ObjectMetadata{}
	} else {
		// It's a file, thus it has metadata
		lastModified = time.Unix(int64(objectMetadata.Mtime), 0).Format(time.RFC3339)
	}
	irminObject := irminModels.Object{
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

func (c *Client) GetPath(workspace, repository, path, ref string) (*irminModels.Object, error) {
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

func (c *Client) GetObjectContent(workspace, repository, path, ref string) (*irminModels.Object, []byte, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Fetch the object metadata from the repository.
	irminObject, err := getObject(path, lakeFSRepositoryName, ref, *c.LakeFSClient)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get object: %w", err)
	}

	// Fetch the content of the object.
	content, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, ref, irminObject.Path)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get object content: %w", err)
	}

	return irminObject, content, nil
}

func (c *Client) UploadObject(workspace, repository, path, ref string, file multipart.File) (*irminModels.Object, error) {
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
	lastModified := time.Unix(int64(objectMetadata.Mtime), 0).Format(time.RFC3339)
	irminObject := irminModels.Object{
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

func (c *Client) MoveObject(workspace, repository, path, ref, newPath string) (*irminModels.Object, error) {
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
	lastModified := time.Unix(int64(objectMetadata.Mtime), 0).Format(time.RFC3339)
	irminObject := irminModels.Object{
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

func (c *Client) CopyObject(workspace, repository, path, ref, newPath string) (*irminModels.Object, error) {
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
	lastModified := time.Unix(int64(objectMetadata.Mtime), 0).Format(time.RFC3339)
	irminObject := irminModels.Object{
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

func (c *Client) GetObjectChanges(workspace, repository, path, ref string) ([]irminModels.Commit, error) {
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
	if objectPathDetails.Type == irminModels.ObjectTypeGroup {
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
	irminCommits := make([]irminModels.Commit, len(lakefsCommits))
	for i, lakeFSCommit := range lakefsCommits {
		previousHash := ""
		if len(lakeFSCommit.Parents) > 0 {
			previousHash = lakeFSCommit.Parents[0]
		}
		author := lakeFSCommit.Committer
		if authorValue, ok := lakeFSCommit.Metadata["author"]; ok && authorValue != "" {
			author = authorValue
		}
		irminCommits[i] = irminModels.Commit{
			Hash:         lakeFSCommit.ID,
			Message:      lakeFSCommit.Message,
			Timestamp:    time.Unix(int64(lakeFSCommit.CreationDate), 0).Format(time.RFC3339),
			Author:       author,
			PreviousHash: &previousHash,
		}
	}

	return irminCommits, nil
}
