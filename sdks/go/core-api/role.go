package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListRoles() ([]irminmodels.Role, *irminmodels.IrminAPIResponse, error) {
	var roles []irminmodels.Role
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/roles",
	}, &roles)
	if err != nil {
		return nil, nil, fmt.Errorf("list roles error: %w", err)
	}
	return roles, apiResp, nil
}
