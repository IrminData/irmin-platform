package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListRoles(ctx context.Context) ([]irminmodels.Role, *irminmodels.IrminAPIResponse, error) {
	var roles []irminmodels.Role
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/roles",
	}, &roles)
	if err != nil {
		return nil, nil, fmt.Errorf("list roles error: %w", err)
	}
	return roles, apiResp, nil
}
