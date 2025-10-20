package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// UpdateUserRolesRequest represents the JSON request body for updating user roles.
type UpdateUserRolesRequest struct {
	Roles []string `json:"roles" validate:"required,dive,validsqid=roles" example:"role_2a8m5x9n4p7s,role_1a2m3x4n5p6s"`
}

func (c *Client) ListUsers(
	ctx context.Context,
	workspace string,
) ([]irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	var users []irminmodels.User
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/users", workspace),
	}, &users)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch users error: %w", err)
	}
	return users, apiResp, nil
}

func (c *Client) GetUser(
	ctx context.Context,
	workspace, userID string,
) (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	var user irminmodels.User
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/users/%s", workspace, userID),
	}, &user)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch user error: %w", err)
	}
	return &user, apiResp, nil
}

func (c *Client) UpdateUserRoles(ctx context.Context,
	workspace, userID string,
	req UpdateUserRolesRequest,
) (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	var user irminmodels.User
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/users/%s", workspace, userID),
		ContentType: "application/json",
		Body:        req,
	}, &user)
	if err != nil {
		return nil, nil, fmt.Errorf("update user roles error: %w", err)
	}
	return &user, apiResp, nil
}

func (c *Client) RemoveUser(ctx context.Context, workspace, userID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/users/%s", workspace, userID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("remove user error: %w", err)
	}
	return apiResp, nil
}
