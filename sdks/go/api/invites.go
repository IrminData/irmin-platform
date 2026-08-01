package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// SendInviteRequest represents the JSON request body for sending an invite.
type SendInviteRequest struct {
	Email string `json:"email" validate:"required,email"  example:"john.doe@example.com"`
	Role  string `json:"role"  validate:"required,max=50" example:"admin"`
}

// UpdateInviteRequest represents the JSON request body for updating an invite.
type UpdateInviteRequest struct {
	Role string `json:"role" validate:"required,max=50" example:"admin"`
}

func (c *Client) ListInviteInbox(ctx context.Context) ([]irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invites []irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/invites",
	}, &invites)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch invites error: %w", err)
	}
	return invites, apiResp, nil
}

func (c *Client) GetInvite(
	ctx context.Context,
	inviteID string,
) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/invites/%s", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) ListInvitesToWorkspace(
	ctx context.Context,
	workspace string,
) ([]irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invites []irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/invites", workspace),
	}, &invites)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch invites error: %w", err)
	}
	return invites, apiResp, nil
}

func (c *Client) SendInvite(
	ctx context.Context,
	workspace string,
	req SendInviteRequest,
) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/invites", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("send invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) ResendInvite(
	ctx context.Context,
	inviteID string,
) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/invites/%s/resend", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("resend invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) DeleteInvite(ctx context.Context, inviteID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/invites/%s", inviteID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete invite error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) UpdateInvite(
	ctx context.Context,
	inviteID string,
	req UpdateInviteRequest,
) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/invites/%s", inviteID),
		ContentType: "application/json",
		Body:        req,
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("send invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) AcceptInvite(
	ctx context.Context,
	inviteID string,
) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/invites/%s/accept", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("accept invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) DeclineInvite(
	ctx context.Context,
	inviteID string,
) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/invites/%s/decline", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("decline invite error: %w", err)
	}
	return &invite, apiResp, nil
}
