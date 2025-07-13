package lakefs

import (
	"fmt"
	"io"
	"irmin-api/utils"
	"net/http"
	"net/url"
	"strconv"
)

// ObjectContentResponse encapsulates the response from the GetObjectContent endpoint.
// It includes the content stream as well as headers such as Content-Length, Last-Modified,
// ETag, and optionally Content-Range (for partial content) or RedirectLocation (if a 302 is returned).
type ObjectContentResponse struct {
	Body             io.ReadCloser // Body contains the object content. The caller is responsible for closing it.
	ContentLength    int64         // ContentLength is the size of the object in bytes.
	LastModified     string        // LastModified is the last modified date of the object.
	ETag             string        // ETag is the entity tag for the object.
	ContentRange     string        // ContentRange is provided when a partial object is returned (HTTP 206).
	RedirectLocation string        // RedirectLocation is provided if the service returns a 302 redirect to a pre‑signed URL.
}

// ObjectMetadata represents the metadata and stats of an object.
type ObjectMetadata struct {
	Path                  string            `json:"path"`
	PathType              PathType          `json:"path_type"`
	PhysicalAddress       string            `json:"physical_address"`                  // The location of the object on the underlying object store. Formatted as a native URI with the object store type as scheme ("s3://...", "gs://...", etc.) Or, in the case of presign=true, will be an HTTP URL to be consumed via regular HTTP GET
	PhysicalAddressExpiry *int64            `json:"physical_address_expiry,omitempty"` // Optional. If present and nonzero, physical_address is a pre-signed URL and will expire at this Unix Epoch time. This will be shorter than the pre-signed URL lifetime if an authentication token is about to expire.
	Checksum              string            `json:"checksum"`
	SizeBytes             int64             `json:"size_bytes"` // The number of bytes in the object. lakeFS always populates this field when returning ObjectStats.
	Mtime                 int64             `json:"mtime"`      // Unix Epoch in seconds of the last modification time of the object.
	Metadata              map[string]string `json:"metadata,omitempty"`
	ContentType           string            `json:"content_type,omitempty"` // The MIME type of the object content, like "application/json" or "text/plain".
}

// ObjectList represents a list of objects.
type ObjectList struct {
	Pagination Pagination       `json:"pagination"`
	Results    []ObjectMetadata `json:"results"`
}

// PathList represents a list of object paths.
type PathList struct {
	Paths []string `json:"paths"`
}

// ObjectCopyRequest represents the request payload to copy an object.
type ObjectCopyRequest struct {
	SrcPath string `json:"src_path"`          // path of the copied object relative to the ref
	SrcRef  string `json:"src_ref,omitempty"` // a reference, if empty uses the provided branch as ref
	Force   bool   `json:"force,omitempty"`
}

// UpdateMetadataRequest represents the request payload to update object metadata.
type UpdateMetadataRequest struct {
	Set map[string]string `json:"set"` // key-value pairs to set
}

// UnderlyingStorageProperties represents the underlying storage properties of an object.
type UnderlyingStorageProperties struct {
	StorageClass string `json:"storage_class"`
}

// GetObjectContent fetches the content of an object from the specified repository and ref.
// It sends a GET request to the endpoint:
//
//	/repositories/{repository}/refs/{ref}/objects?path={path}
//
// The endpoint returns an octet-stream along with headers such as Content-Length,
// Last-Modified and ETag. The response may be one of:
//   - 200 OK: full object content is returned.
//   - 206 Partial Content: a partial object is returned (with the Content-Range header).
//   - 302 Found: a redirect is provided (with the Location header pointing to a pre‑signed URL).
//
// The caller should check the response headers to determine if additional handling (e.g. following a redirect)
// is required, and must close the Body if it is non‑nil.
func (c *Client) GetObjectContent(repositoryID, ref, objectPath string) (*ObjectContentResponse, error) {
	// Build the endpoint with query parameter.
	endpoint := fmt.Sprintf("/repositories/%s/refs/%s/objects?path=%s", repositoryID, ref, url.QueryEscape(objectPath))
	//nolint:bodyclose // we close the body in the caller
	resp, err := c.doStreamRequest(
		"GET",
		endpoint,
		nil,
		[]int{http.StatusOK, http.StatusPartialContent, http.StatusFound},
		"application/octet-stream",
	)
	if err != nil {
		return nil, err
	}

	// Do not close resp.Body here as the caller is responsible for it.
	return &ObjectContentResponse{
		Body:             resp.Body,
		ContentLength:    resp.ContentLength,
		LastModified:     resp.Header.Get("Last-Modified"),
		ETag:             resp.Header.Get("ETag"),
		ContentRange:     resp.Header.Get("Content-Range"),
		RedirectLocation: resp.Header.Get("Location"),
	}, nil
}

// GetObjectContentWithRange is similar to GetObjectContent but allows specifying a Range header.
func (c *Client) GetObjectContentWithRange(
	repositoryID, ref, path, rangeHeader string,
) (*ObjectContentResponse, error) {
	endpoint := fmt.Sprintf("/repositories/%s/refs/%s/objects?path=%s", repositoryID, ref, url.QueryEscape(path))
	req, newRequestErr := http.NewRequestWithContext(c.ctx, http.MethodGet, c.baseURL+endpoint, nil)
	if newRequestErr != nil {
		return nil, fmt.Errorf("failed to create request: %w", newRequestErr)
	}

	req.Header.Set("Accept", "application/octet-stream")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	req.Header.Set("Range", rangeHeader)

	// Use a temporary client that does not follow redirects.
	tempClient := *c.client
	tempClient.CheckRedirect = func(_ *http.Request, _ []*http.Request) error {
		return http.ErrUseLastResponse
	}

	resp, doRequestErr := tempClient.Do(req)
	if doRequestErr != nil {
		return nil, fmt.Errorf("failed to execute request: %w", doRequestErr)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent &&
		resp.StatusCode != http.StatusFound {
		defer resp.Body.Close()
		bodyBytes, readAllErr := io.ReadAll(resp.Body)
		if readAllErr != nil {
			return nil, fmt.Errorf("failed to read response body: %w", readAllErr)
		}
		return nil, fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return &ObjectContentResponse{
		Body:             resp.Body,
		ContentLength:    resp.ContentLength,
		LastModified:     resp.Header.Get("Last-Modified"),
		ETag:             resp.Header.Get("ETag"),
		ContentRange:     resp.Header.Get("Content-Range"),
		RedirectLocation: resp.Header.Get("Location"),
	}, nil
}

// handleRedirectResponse handles a redirect response by following the redirect URL and returning the content.
func (c *Client) handleRedirectResponse(redirectURL, rangeHeader string) ([]byte, error) {
	req, newRequestErr := http.NewRequestWithContext(c.ctx, http.MethodGet, redirectURL, nil)
	if newRequestErr != nil {
		return nil, fmt.Errorf("failed to create request for redirect: %w", newRequestErr)
	}

	redirectResp, getRedirectErr := c.client.Do(req)
	if getRedirectErr != nil {
		return nil, fmt.Errorf("failed to follow redirect for range %s: %w", rangeHeader, getRedirectErr)
	}
	defer redirectResp.Body.Close()

	if redirectResp.StatusCode != http.StatusOK && redirectResp.StatusCode != http.StatusPartialContent {
		bodyBytes, readAllErr := io.ReadAll(redirectResp.Body)
		if readAllErr != nil {
			return nil, fmt.Errorf("failed to read response body: %w", readAllErr)
		}
		return nil, fmt.Errorf(
			"failed to download object from redirect URL %s, status: %d, message: %s",
			redirectURL,
			redirectResp.StatusCode,
			string(bodyBytes),
		)
	}

	return io.ReadAll(redirectResp.Body)
}

// handleRangeRequest handles a single range request and returns the data and next start position.
func (c *Client) handleRangeRequest(repositoryID, ref, objectPath, rangeHeader string) ([]byte, int64, error) {
	partResp, getObjectContentWithRangeErr := c.GetObjectContentWithRange(repositoryID, ref, objectPath, rangeHeader)
	if getObjectContentWithRangeErr != nil {
		return nil, 0, fmt.Errorf(
			"failed to get object content with range %s: %w",
			rangeHeader,
			getObjectContentWithRangeErr,
		)
	}
	defer partResp.Body.Close()

	var partData []byte
	var nextStart int64

	if redirectURL := partResp.RedirectLocation; redirectURL != "" {
		var handleRedirectResponseErr error
		partData, handleRedirectResponseErr = c.handleRedirectResponse(redirectURL, rangeHeader)
		if handleRedirectResponseErr != nil {
			return nil, 0, fmt.Errorf("failed to handle redirect response: %w", handleRedirectResponseErr)
		}
	} else {
		var readAllErr error
		partData, readAllErr = io.ReadAll(partResp.Body)
		if readAllErr != nil {
			return nil, 0, fmt.Errorf("failed to read partial object: %w", readAllErr)
		}
	}

	// Update next start position based on Content-Range header
	if cr := partResp.ContentRange; cr != "" {
		_, newEnd, _, parseContentRangeErr := utils.ParseContentRange(cr)
		if parseContentRangeErr != nil {
			return nil, 0, fmt.Errorf("failed to parse Content-Range: %w", parseContentRangeErr)
		}
		nextStart = newEnd + 1
	}

	return partData, nextStart, nil
}

// GetFullObjectContent retrieves the full content of an object by handling partial responses and redirects.
// If the initial response is partial this function will iteratively request the remaining ranges and combine them into a single byte slice.
// If a redirect is provided, the function will follow it and return the content from the redirect URL.
func (c *Client) GetFullObjectContent(repositoryID, ref, objectPath string) ([]byte, error) {
	// Initial request without a Range header.
	objResp, getObjectContentErr := c.GetObjectContent(repositoryID, ref, objectPath)
	if getObjectContentErr != nil {
		return nil, fmt.Errorf("failed to get object content: %w", getObjectContentErr)
	}
	defer objResp.Body.Close()

	// Handle redirect if provided.
	if redirectURL := objResp.RedirectLocation; redirectURL != "" {
		return c.handleRedirectResponse(redirectURL, "")
	}

	// If no Content-Range header is provided, assume full content.
	if objResp.ContentRange == "" {
		return io.ReadAll(objResp.Body)
	}

	// Parse the Content-Range header.
	_, end, total, parseContentRangeErr := utils.ParseContentRange(objResp.ContentRange)
	if parseContentRangeErr != nil {
		return nil, fmt.Errorf("failed to parse Content-Range header: %w", parseContentRangeErr)
	}

	// Read the initial partial content.
	data, readAllErr := io.ReadAll(objResp.Body)
	if readAllErr != nil {
		return nil, fmt.Errorf("failed to read initial partial object: %w", readAllErr)
	}

	// If the initial chunk covers the full object, return it.
	if end+1 >= total {
		return data, nil
	}

	// Otherwise, iteratively request subsequent ranges.
	currentStart := end + 1
	for currentStart < total {
		rangeHeader := fmt.Sprintf("bytes=%d-%d", currentStart, total-1)
		partData, nextStart, handleRangeRequestErr := c.handleRangeRequest(repositoryID, ref, objectPath, rangeHeader)
		if handleRangeRequestErr != nil {
			return nil, fmt.Errorf("failed to handle range request: %w", handleRangeRequestErr)
		}
		data = append(data, partData...)
		currentStart = nextStart
	}

	return data, nil
}

// CheckObjectExists checks if an object exists in the specified repository and ref.
func (c *Client) CheckObjectExists(repositoryID, ref, objectPath string) error {
	endpoint := fmt.Sprintf("/repositories/%s/refs/%s/objects?path=%s", repositoryID, ref, url.QueryEscape(objectPath))
	if doRequestErr := c.doRequest("HEAD", endpoint, nil, []int{http.StatusOK, http.StatusPartialContent}, nil); doRequestErr != nil {
		return fmt.Errorf("failed to check object exists: %w", doRequestErr)
	}
	return nil
}

// UploadObject uploads an object to the specified repository branch.
func (c *Client) UploadObject(
	repositoryID, branch, objectPath string,
	content io.Reader,
	force bool,
) (*ObjectMetadata, error) {
	// Build the endpoint URL with query parameters.
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/objects", repositoryID, branch)
	q := url.Values{}
	q.Set("path", objectPath)
	q.Set("force", strconv.FormatBool(force))
	endpoint = endpoint + "?" + q.Encode()

	// Build the multipart payload using the helper.
	payload, contentType, createMultipartPayloadErr := utils.CreateMultipartPayload(
		map[string]utils.FilePayload{"content": {FileName: "content", Reader: content}},
		nil,
	)
	if createMultipartPayloadErr != nil {
		return nil, fmt.Errorf("failed to create multipart payload: %w", createMultipartPayloadErr)
	}

	// Use the doMultipartRequest helper to execute the request.
	var metadata ObjectMetadata
	if doMultipartRequestErr := c.doMultipartRequest("POST", endpoint, payload, contentType, []int{http.StatusCreated}, &metadata); doMultipartRequestErr != nil {
		return nil, fmt.Errorf("failed to upload object: %w", doMultipartRequestErr)
	}
	return &metadata, nil
}

// DeleteObject deletes an object from the specified repository branch.
func (c *Client) DeleteObject(repositoryID, branch, objectPath string, force bool) error {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/objects", repositoryID, branch)
	q := url.Values{}
	q.Set("path", objectPath)
	q.Set("force", strconv.FormatBool(force))

	endpoint = endpoint + "?" + q.Encode()
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// DeleteObjects deletes multiple objects from the specified repository branch.
func (c *Client) DeleteObjects(repositoryID, branch string, objectPaths PathList, force bool) error {
	endpoint := fmt.Sprintf("/repositories/%s/branches/%s/objects/delete", repositoryID, branch)
	q := url.Values{}
	q.Set("force", strconv.FormatBool(force))
	endpoint = endpoint + "?" + q.Encode()
	return c.doRequest("POST", endpoint, objectPaths, []int{http.StatusOK}, nil)
}

// CopyObject copies an object from one path to another in the specified repository branch.
func (c *Client) CopyObject(
	repositoryID, branch, destinationPath string,
	reqData ObjectCopyRequest,
) (*ObjectMetadata, error) {
	endpoint := fmt.Sprintf(
		"/repositories/%s/branches/%s/objects/copy?dest_path=%s",
		repositoryID,
		branch,
		destinationPath,
	)
	var metadata ObjectMetadata
	if doRequestErr := c.doRequest("POST", endpoint, reqData, []int{http.StatusCreated}, &metadata); doRequestErr != nil {
		return nil, fmt.Errorf("failed to copy object: %w", doRequestErr)
	}
	return &metadata, nil
}

// GetObjectMetadata fetches the metadata of an object from the specified repository and ref.
func (c *Client) GetObjectMetadata(
	repositoryID, ref, objectPath string,
	userMetadata, presign bool,
) (*ObjectMetadata, error) {
	endpoint := fmt.Sprintf("/repositories/%s/refs/%s/objects/stat", repositoryID, ref)
	q := url.Values{}
	q.Set("path", objectPath)
	q.Set("user_metadata", strconv.FormatBool(userMetadata))
	q.Set("presign", strconv.FormatBool(presign))
	endpoint = endpoint + "?" + q.Encode()

	var metadata ObjectMetadata
	if doRequestErr := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &metadata); doRequestErr != nil {
		return nil, fmt.Errorf("failed to get object metadata: %w", doRequestErr)
	}
	return &metadata, nil
}

// RewriteObjectMetadata updates all the user metadata of an object in the specified repository branch.
func (c *Client) RewriteObjectMetadata(repositoryID, branch, objectPath string, reqData UpdateMetadataRequest) error {
	endpoint := fmt.Sprintf(
		"/repositories/%s/branches/%s/objects/stat/user_metadata?path=%s",
		repositoryID,
		branch,
		url.QueryEscape(objectPath),
	)
	if doRequestErr := c.doRequest("PUT", endpoint, reqData, []int{http.StatusOK, http.StatusCreated}, nil); doRequestErr != nil {
		return fmt.Errorf("failed to rewrite object metadata: %w", doRequestErr)
	}
	return nil
}

// GetObjectUnderlyingStorageProperties fetches the underlying storage properties of an object.
func (c *Client) GetObjectUnderlyingStorageProperties(
	repositoryID, ref, objectPath string,
) (*UnderlyingStorageProperties, error) {
	endpoint := fmt.Sprintf(
		"/repositories/%s/refs/%s/objects/underlyingProperties?path=%s",
		repositoryID,
		ref,
		url.QueryEscape(objectPath),
	)
	var storageProperties UnderlyingStorageProperties
	if doRequestErr := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &storageProperties); doRequestErr != nil {
		return nil, fmt.Errorf("failed to get object underlying storage properties: %w", doRequestErr)
	}
	return &storageProperties, nil
}

// ListObjects retrieves a list of object from the specified repository, ref and prefix. Similar to `ls` command.
func (c *Client) ListObjects(
	repositoryID, ref, prefix, after, delimiter string,
	userMetadata, presign bool,
	amount int,
) (*ObjectList, error) {
	endpoint := fmt.Sprintf("/repositories/%s/refs/%s/objects/ls", repositoryID, ref)
	q := url.Values{}
	if prefix != "" {
		q.Set("prefix", prefix)
	}
	if after != "" {
		q.Set("after", after)
	}
	if delimiter != "" {
		q.Set("delimiter", delimiter)
	}
	q.Set("user_metadata", strconv.FormatBool(userMetadata))
	q.Set("presign", strconv.FormatBool(presign))
	if amount > 0 {
		q.Set("amount", strconv.Itoa(amount))
	}
	endpoint = endpoint + "?" + q.Encode()

	var listResp ObjectList
	if doRequestErr := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); doRequestErr != nil {
		return nil, fmt.Errorf("failed to list objects: %w", doRequestErr)
	}
	return &listResp, nil
}

// ListAllObjects retrieves all objects from the specified repository and prefix.
func (c *Client) ListAllObjects(
	repositoryID, ref, prefix, after, delimiter string,
	userMetadata, presign bool,
) ([]ObjectMetadata, error) {
	var allObjects []ObjectMetadata
	for {
		objects, err := c.ListObjects(
			repositoryID,
			ref,
			prefix,
			after,
			delimiter,
			userMetadata,
			presign,
			DefaultListAmountLimit,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to list objects: %w", err)
		}
		allObjects = append(allObjects, objects.Results...)
		if !objects.Pagination.HasMore {
			break
		}
		after = objects.Pagination.NextOffset
	}
	return allObjects, nil
}
