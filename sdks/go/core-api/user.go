package irmincore

import (
	"fmt"
	"net/http"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListUsers(workspace string) ([]irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	var users []irminmodels.User
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/users", workspace),
	}, &users)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch users error: %w", err)
	}
	return users, apiResp, nil
}

func (c *Client) GetUser(workspace, userID string) (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	var user irminmodels.User
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/users/%s", workspace, userID),
	}, &user)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch user error: %w", err)
	}
	return &user, apiResp, nil
}

func (c *Client) UpdateUserRoles(
	workspace, userID string,
	roles []string,
) (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	updatedRoles := strings.Join(roles, ",")
	var user irminmodels.User
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/users/%s", workspace, userID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"roles": updatedRoles,
		},
	}, &user)
	if err != nil {
		return nil, nil, fmt.Errorf("update user roles error: %w", err)
	}
	return &user, apiResp, nil
}

func (c *Client) RemoveUser(workspace, userID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/users/%s", workspace, userID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("remove user error: %w", err)
	}
	return apiResp, nil
}
