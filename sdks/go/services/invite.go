package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
	"net/url"
	"strings"
)

// InviteService handles invite-related API calls
type InviteService struct {
	client *client.Client
}

// NewInviteService creates a new InviteService
func NewInviteService(client *client.Client) *InviteService {
	return &InviteService{
		client: client,
	}
}

// InviteUserToWorkspace invites a user to the workspace
func (s *InviteService) InviteUserToWorkspace(firstName, lastName, email, phone, company, role string) (*models.Invite, *client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("first_name", firstName)
	form.Set("last_name", lastName)
	form.Set("email", email)
	form.Set("phone", phone)
	form.Set("company", company)
	form.Set("role", role)

	var invite models.Invite
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/invites",
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, &invite)
	if err != nil {
		return nil, nil, fmt.Errorf("invite user error: %w", err)
	}
	return &invite, apiResp, nil
}

// ResendUserInvite resends an invite
func (s *InviteService) ResendUserInvite(inviteID string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/invites/%s/resend", inviteID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("resend invite error: %w", err)
	}
	return apiResp, nil
}

// CancelUserInvite cancels an invite
func (s *InviteService) CancelUserInvite(inviteID string) (*client.IrminAPIResponse, error) {
	form := url.Values{}
	form.Set("_method", "DELETE")

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/invites/%s", inviteID),
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("cancel invite error: %w", err)
	}
	return apiResp, nil
}

// FetchInvites retrieves a list of invites
func (s *InviteService) FetchInvites(workspace, user string, trashed, expired bool) ([]models.Invite, *client.IrminAPIResponse, error) {
	endpoint := "/v1/invites"
	params := ""

	if workspace != "" {
		params += fmt.Sprintf("workspace=%s&", workspace)
	}
	if user != "" {
		params += fmt.Sprintf("user=%s&", user)
	}
	if trashed {
		params += "trashed=1&"
	}
	if expired {
		params += "expired=1&"
	}

	if len(params) > 0 {
		endpoint += "?" + params[:len(params)-1] // Remove trailing "&"
	}

	var invites []models.Invite
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &invites)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch invites error: %w", err)
	}
	return invites, apiResp, nil
}

// AcceptInvite accepts an invite
func (s *InviteService) AcceptInvite(inviteID, hash, password, passwordConfirmation string) (*client.IrminAPIResponse, error) {
	form := url.Values{}
	if password != "" {
		form.Set("password", password)
	}
	if passwordConfirmation != "" {
		form.Set("password_confirmation", passwordConfirmation)
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/invites/%s/accept/%s", inviteID, hash),
		ContentType: "application/x-www-form-urlencoded",
		Body:        strings.NewReader(form.Encode()),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("accept invite error: %w", err)
	}
	return apiResp, nil
}

// DeclineInvite declines an invite
func (s *InviteService) DeclineInvite(inviteID, hash string) (*client.IrminAPIResponse, error) {
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/invites/%s/decline/%s", inviteID, hash),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("decline invite error: %w", err)
	}
	return apiResp, nil
}
