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

// processChildren processes immediate children of a group object and returns them as Irmin objects.
func processChildren(
	path string,
	rawChildren []lakefs.ObjectMetadata,
	lakeFSRepositoryName, ref string,
	lakefsClient lakefs.Client,
) ([]irminmodels.Object, error) {
	// Map immediate files and directories under this path
	files, dirs := mapImmediateChildren(path, rawChildren)

	// Process directories first
	children, err := processDirectories(path, dirs, lakeFSRepositoryName, ref, lakefsClient)
	if err != nil {
		return nil, err
	}

	// Then process files
	fileObjects := processFiles(files)
	children = append(children, fileObjects...)

	return children, nil
}

// mapImmediateChildren separates immediate files and directories from raw children.
func mapImmediateChildren(
	path string,
	rawChildren []lakefs.ObjectMetadata,
) (map[string]lakefs.ObjectMetadata, map[string]struct{}) {
	files := make(map[string]lakefs.ObjectMetadata)
	dirs := make(map[string]struct{})

	for _, child := range rawChildren {
		rel := child.Path
		if path != "" {
			rel = strings.TrimPrefix(child.Path, path+"/")
		}
		parts := strings.SplitN(rel, "/", pathSplitLimit)
		name := parts[0]

		// Skip system paths
		if IsSystemPath(name) {
			continue
		}

		if len(parts) > 1 {
			dirs[name] = struct{}{}
		} else {
			files[name] = child
		}
	}

	return files, dirs
}

// processDirectories recursively processes directory children.
func processDirectories(
	path string,
	dirs map[string]struct{},
	lakeFSRepositoryName, ref string,
	lakefsClient lakefs.Client,
) ([]irminmodels.Object, error) {
	var children []irminmodels.Object
	for dir := range dirs {
		subPath := dir
		if path != "" {
			subPath = path + "/" + dir
		}
		nestedObj, err := getObject(subPath, lakeFSRepositoryName, ref, lakefsClient)
		if err != nil {
			return nil, err
		}
		children = append(children, *nestedObj)
	}
	return children, nil
}

// processFiles converts file metadata to Irmin objects.
func processFiles(files map[string]lakefs.ObjectMetadata) []irminmodels.Object {
	var children []irminmodels.Object
	for name, meta := range files {
		objectDetails := utils.ParseObjectDetailsFromPath(meta.Path)
		lastModified := time.Unix(meta.Mtime, 0).Format(time.RFC3339)
		children = append(children, irminmodels.Object{
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
	return children
}

// getObjectMetadata retrieves metadata for an object.
func getObjectMetadata(
	path string,
	objectPathDetails utils.ObjectDetails,
	lakeFSRepositoryName, ref string,
	lakefsClient lakefs.Client,
) (*lakefs.ObjectMetadata, error) {
	if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
		return &lakefs.ObjectMetadata{
			Path:                  path,
			PathType:              lakefs.PathTypeObject,
			PhysicalAddress:       "",
			PhysicalAddressExpiry: nil,
			Checksum:              "",
			SizeBytes:             0,
			Mtime:                 0,
			Metadata:              nil,
			ContentType:           "",
		}, nil
	}

	return lakefsClient.GetObjectMetadata(lakeFSRepositoryName, ref, path, true, false)
}

// getObject fetches the object from a workspace repository at a specific ref and path
// and returns it as an Irmin formatted object.
func getObject(
	path, lakeFSRepositoryName, ref string,
	lakefsClient lakefs.Client,
) (*irminmodels.Object, error) {
	// Check if the object is a system path
	if IsSystemPath(path) {
		return nil, fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Trim leading and trailing slashes from the path
	path = strings.Trim(path, "/")

	// Parse object details
	objectPathDetails := utils.ParseObjectDetailsFromPath(path)

	// Get object metadata
	objectMetadata, err := getObjectMetadata(path, objectPathDetails, lakeFSRepositoryName, ref, lakefsClient)
	if err != nil {
		return nil, err
	}

	// Process children if it's a group
	var children []irminmodels.Object
	if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
		rawChildren, rawChildrenErr := lakefsClient.ListAllObjects(lakeFSRepositoryName, ref, path, "", "", true, false)
		if rawChildrenErr != nil {
			return nil, rawChildrenErr
		}
		var processChildrenErr error
		children, processChildrenErr = processChildren(path, rawChildren, lakeFSRepositoryName, ref, lakefsClient)
		if processChildrenErr != nil {
			return nil, processChildrenErr
		}
	}

	// Determine last modified time
	var lastModified string
	if objectMetadata != nil && objectPathDetails.Type != irminmodels.ObjectTypeGroup {
		lastModified = time.Unix(objectMetadata.Mtime, 0).Format(time.RFC3339)
	}

	// Construct and return the Irmin object
	return &irminmodels.Object{
		Name:                  objectPathDetails.Name,
		Path:                  objectPathDetails.FullPath,
		Type:                  objectPathDetails.Type,
		ContentType:           objectPathDetails.ContentType,
		PhysicalAddress:       objectMetadata.PhysicalAddress,
		PhysicalAddressExpiry: objectMetadata.PhysicalAddressExpiry,
		SizeBytes:             objectMetadata.SizeBytes,
		LastModified:          lastModified,
		Metadata:              objectMetadata.Metadata,
		Children:              children,
	}, nil
}

func (c *Client) GetPath(workspace, repository, path, ref string) (*irminmodels.Object, error) {
	// Check if the object is a system path
	objectName := utils.ParseObjectDetailsFromPath(path).Name
	if IsSystemPath(objectName) {
		return nil, fmt.Errorf("access to system path %s is not allowed", objectName)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Fetch the object metadata from the repository.
	irminObject, getObjectErr := getObject(path, lakeFSRepositoryName, ref, *c.LakeFSClient)
	if getObjectErr != nil {
		return nil, fmt.Errorf("failed to get object: %w", getObjectErr)
	}

	return irminObject, nil
}

func (c *Client) GetObjectContent(workspace, repository, path, ref string) ([]byte, error) {
	// Check if the object is a system path
	if IsSystemPath(path) {
		return nil, fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Fetch the content of the object.
	content, getFullObjectContentErr := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, ref, path)
	if getFullObjectContentErr != nil {
		return nil, fmt.Errorf("failed to get object content: %w", getFullObjectContentErr)
	}

	return content, nil
}

func (c *Client) UploadObject(workspace, repository, path, ref string, file io.Reader) (*irminmodels.Object, error) {
	// Check if the object is a system path
	if IsSystemPath(path) {
		return nil, fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Format the object path.
	path = strings.Trim(path, "/")

	// Upload the object to the repository using received file.
	objectMetadata, uploadObjectErr := c.LakeFSClient.UploadObject(lakeFSRepositoryName, ref, path, file, false)
	if uploadObjectErr != nil {
		return nil, fmt.Errorf("failed to upload object: %w", uploadObjectErr)
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
	// Check if the object is a system path
	if IsSystemPath(path) {
		return fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Format the object path.
	path = strings.Trim(path, "/")

	// Delete the object from the repository.
	deleteObjectErr := c.LakeFSClient.DeleteObject(lakeFSRepositoryName, ref, path, false)
	if deleteObjectErr != nil {
		return fmt.Errorf("failed to delete object: %w", deleteObjectErr)
	}

	return nil
}

func (c *Client) MoveObject(workspace, repository, path, ref, newPath string) (*irminmodels.Object, error) {
	// Check if the object is a system path
	if IsSystemPath(path) {
		return nil, fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Format the object paths.
	path = strings.Trim(path, "/")
	newPath = strings.Trim(newPath, "/")

	// Copy the object in the repository to the new path.
	objectMetadata, copyObjectErr := c.LakeFSClient.CopyObject(
		lakeFSRepositoryName,
		ref,
		newPath,
		lakefs.ObjectCopyRequest{
			SrcPath: path,
			SrcRef:  ref,
		},
	)
	if copyObjectErr != nil {
		return nil, fmt.Errorf("failed to copy object: %w", copyObjectErr)
	}

	// Delete the original object from the repository.
	deleteObjectErr := c.LakeFSClient.DeleteObject(lakeFSRepositoryName, ref, path, false)
	if deleteObjectErr != nil {
		return nil, fmt.Errorf("failed to delete object: %w", deleteObjectErr)
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
	// Check if the object is a system path
	if IsSystemPath(path) {
		return nil, fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Format the object paths.
	path = strings.Trim(path, "/")
	newPath = strings.Trim(newPath, "/")

	// Copy the object in the repository to the new path.
	objectMetadata, copyObjectErr := c.LakeFSClient.CopyObject(
		lakeFSRepositoryName,
		ref,
		newPath,
		lakefs.ObjectCopyRequest{
			SrcPath: path,
			SrcRef:  ref,
		},
	)
	if copyObjectErr != nil {
		return nil, fmt.Errorf("failed to copy object: %w", copyObjectErr)
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
	// Check if the object is a system path
	if IsSystemPath(path) {
		return nil, fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if getRepositoryErr != nil {
			return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
		}
		ref = repository.DefaultBranch
	}

	// Parse the object details from the path.
	objectPathDetails := utils.ParseObjectDetailsFromPath(path)

	// Fetch commits
	var lakefsCommits []lakefs.Commit
	var getCommitsErr error
	if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
		// If object is a group - treat it as a prefix when fetching the commit list
		lakefsCommits, getCommitsErr = c.LakeFSClient.ListAllCommits(
			lakeFSRepositoryName,
			ref,
			"",
			"",
			"",
			nil,
			[]string{
				objectPathDetails.FullPath,
			},
		)
	} else {
		// If object is not a group - treat it as an object
		lakefsCommits, getCommitsErr = c.LakeFSClient.ListAllCommits(lakeFSRepositoryName, ref, "", "", "", []string{
			objectPathDetails.FullPath,
		}, nil)
	}
	if getCommitsErr != nil {
		return nil, fmt.Errorf("failed to get commits: %w", getCommitsErr)
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
