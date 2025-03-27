package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListRoles() ([]irminModels.IrminRole, *irminModels.IrminAPIResponse, error) {
	var roles []irminModels.IrminRole
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/roles",
	}, &roles)
	if err != nil {
		return nil, nil, fmt.Errorf("list roles error: %w", err)
	}
	return roles, apiResp, nil
}
