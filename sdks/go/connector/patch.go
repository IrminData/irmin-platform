package irminConnectorClient

import "net/http"

// OperationPatch sends a patch file to the /operation/patch endpoint to apply JSON patch operations to the data.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - A JSON form file "patches" containing the list of JSON patch operations to apply to the data.
//
// Returns:
// - A string containing the response message from the push operation.
// - An error if the request fails.
func (c *Client) OperationPatch(patchFile FormFile) (string, error) {
	patchFile.FieldName = "patches" // Set the field name for the file.
	// Set up the request options for the push operation.
	opts := RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/patch",
		ContentType: "multipart/form-data",
		Files:       []FormFile{patchFile},
	}

	// Send the request and get the raw response.
	data, err := c.Request(opts)
	if err != nil {
		return "", err
	}

	// Return the response message as a string.
	return string(data), nil
}
