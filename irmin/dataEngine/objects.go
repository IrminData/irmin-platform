package dataEngine

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

type Object struct {
	Name                  string                 `json:"name"`
	Path                  string                 `json:"path"`
	Type                  irminModels.ObjectType `json:"type"`
	ContentType           string                 `json:"content_type,omitempty"`            // The MIME type of the object content, like "application/json" or "text/plain".
	PhysicalAddress       string                 `json:"physical_address,omitempty"`        // The location of the object on the underlying object store. Formatted as a native URI with the object store type as scheme ("s3://...", "gs://...", etc.) Or, in the case of presign=true, will be an HTTP URL to be consumed via regular HTTP GET
	PhysicalAddressExpiry *int64                 `json:"physical_address_expiry,omitempty"` // If present and nonzero, physical_address is a pre-signed URL and will expire at this Unix Epoch time. This will be shorter than the pre-signed URL lifetime if an authentication token is about to expire.
	SizeBytes             int64                  `json:"size_bytes,omitempty"`              // The number of bytes in the object.
	LastModified          string                 `json:"last_modified,omitempty"`           // The last modified time of the object in RFC3339 format.
	Metadata              map[string]string      `json:"metadata,omitempty"`                // Key-value pairs of metadata about the object.
	Children              []Object               `json:"children,omitempty"`                // If the object is a group, this will contain the children objects.
}

func (c *Client) GetPath(workspace, repository, path, ref string) (*Object, error) {
	var data Object
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/objects?path=%s&ref=%s", workspace, repository, path, ref)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) GetObjectContent(workspace, repository, path, ref string) ([]PulledFile, error) {
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/objects/content?path=%s&ref=%s", workspace, repository, path, ref)
	// Call the API endpoint.
	files, err := c.FetchStreamFiles(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

func (c *Client) UploadObject(workspace, repository, path, ref string, file FormFile) (*Object, error) {
	var data Object
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/objects?path=%s&ref=%s", workspace, repository, path, ref)
	// Call the API endpoint.
	file.FieldName = "file"
	if err := c.FetchAPI(RequestOptions{
		Method:        http.MethodPost,
		Endpoint:      endpoint,
		AllowedStatus: []int{http.StatusCreated, http.StatusOK},
		ContentType:   "multipart/form-data",
		Files:         []FormFile{file},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) DeleteObject(workspace, repository, path, ref string) error {
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/objects?path=%s&ref=%s", workspace, repository, path, ref)
	// Call the API endpoint.
	return c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: endpoint,
	}, nil)
}

func (c *Client) MoveObject(workspace, repository, path, ref, newPath string) (*Object, error) {
	var data Object
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/objects/move?path=%s&ref=%s", workspace, repository, path, ref)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_path": newPath,
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) CopyObject(workspace, repository, path, ref, newPath string) (*Object, error) {
	var data Object
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/objects/copy?path=%s&ref=%s", workspace, repository, path, ref)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_path": newPath,
		},
	}, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *Client) GetObjectChanges(workspace, repository, path, ref string) ([]irminModels.Commit, error) {
	var data []irminModels.Commit
	// Format the endpoint.
	endpoint := fmt.Sprintf("/workspace/%s/repositories/%s/objects/changes?path=%s&ref=%s", workspace, repository, path, ref)
	// Call the API endpoint.
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &data); err != nil {
		return nil, err
	}
	return data, nil
}
