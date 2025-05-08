package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListInviteInbox() ([]irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invites []irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/invites",
	}, &invites)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch invites error: %w", err)
	}
	return invites, apiResp, nil
}

func (c *Client) GetInvite(inviteID string) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/invites/%s", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) ListInvitesToWorkspace(workspace string) ([]irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invites []irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/invites", workspace),
	}, &invites)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch invites error: %w", err)
	}
	return invites, apiResp, nil
}

func (c *Client) SendInvite(workspace, email, role string) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/invites", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"email": email,
			"role":  role,
		},
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("send invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) ResendInvite(inviteID string) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/invites/%s/resend", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("resend invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) DeleteInvite(inviteID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/invites/%s", inviteID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete invite error: %w", err)
	}
	return apiResp, nil
}

func (c *Client) UpdateInvite(inviteID, role string) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/invites/%s", inviteID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"role": role,
		},
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("send invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) AcceptInvite(inviteID string) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/invites/%s/accept", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("accept invite error: %w", err)
	}
	return &invite, apiResp, nil
}

func (c *Client) DeclineInvite(inviteID string) (*irminmodels.Invite, *irminmodels.IrminAPIResponse, error) {
	var invite irminmodels.Invite
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/invites/%s/decline", inviteID),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("decline invite error: %w", err)
	}
	return &invite, apiResp, nil
}
