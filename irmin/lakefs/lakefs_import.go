package lakefs

import (
	"fmt"
	"net/http"
)

// ImportStatus represents the status of an import operation.
type ImportStatus struct {
	Completed       bool   `json:"completed"`
	UpdateTime      string `json:"update_time"` // Timestamp of the last update
	IngestedObjects int    `json:"ingested_objects"`
	MetaRangeID     string `json:"metarange_id"`
	Commit          Commit `json:"commit"`
	Error           struct {
		Message string `json:"message"`
	} `json:"error"`
}

// ImportLocationType represents the type of an import location specified in an import operation.
type ImportLocationType string

const (
	// ImportLocationTypeCommonPrefix represents a common prefix import location.
	ImportLocationTypeCommonPrefix ImportLocationType = "common_prefix"
	// ImportLocationTypeObject represents an object import location.
	ImportLocationTypeObject ImportLocationType = "object"
)

// ImportLocation represents the location of an import operation.
type ImportLocation struct {
	// Path type, can either be 'common_prefix' or 'object'
	Type ImportLocationType `json:"type"`
	// A source location to a 'common_prefix' or to a single object. Must match the lakeFS installation blockstore type.
	// Example: s3://my-bucket/production/collections/
	Path string `json:"path"`
	// Destination for the imported objects on the branch. Must be a relative path to the branch.
	// If the type is an 'object', the destination is the exact object name under the branch.
	// If the type is a 'common_prefix', the destination is the prefix under the branch.
	// Example: collections/
	Destination string `json:"destination"`
}

// ImportCreateRequest represents the request payload to create an import operation.
type ImportCreateRequest struct {
	Paths  []ImportLocation    `json:"paths"`
	Commit CommitCreateRequest `json:"commit"`
	Force  bool                `json:"force"`
}

// ImportCreateResponse represents the response when creating an import operation.
type ImportCreateResponse struct {
	// The ID of the import process
	ID string `json:"id"`
}

// GetImportStatus fetches the status of an import operation by its ID.
func (c *Client) GetImportStatus(repositoryID, branchID, importID string) (*ImportStatus, error) {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/import?id=%s", repositoryID, branchID, importID)

	var importStatus ImportStatus
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &importStatus); err != nil {
		return nil, err
	}
	return &importStatus, nil
}

// CreateImport imports objects from a source location in the object store to a LakeFS repository branch.
func (c *Client) CreateImport(
	repositoryID, branchID string,
	reqData ImportCreateRequest,
) (*ImportCreateResponse, error) {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/import", repositoryID, branchID)

	var importResp ImportCreateResponse
	if err := c.doRequest("POST", endpoint, reqData, []int{http.StatusCreated}, &importResp); err != nil {
		return nil, err
	}
	return &importResp, nil
}

// DeleteImport cancels an ongoing import operation by its ID.
func (c *Client) DeleteImport(repositoryID, branchID, importID string) error {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/import?id=%s", repositoryID, branchID, importID)

	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusNoContent}, nil)
}
