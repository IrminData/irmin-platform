package irminConnectorClient

import (
	"fmt"
	"net/http"

	"github.com/IrminData/irmin-sdk-go/models"
)

// GetSchema retrieves the schema for a specific operation method.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - method: The operation method for which to retrieve the schema, e.g. "pull", "push", etc.
//
// Returns:
// - The schema for the specified operation method if the request is successful.
// - An error if the request fails.
func (c *Client) GetSchema(method string) (*models.ObjectSchema, error) {
	var schema models.ObjectSchema
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/operation/schema/%s", method),
	}, &schema); err != nil {
		return nil, err
	}
	return &schema, nil
}
