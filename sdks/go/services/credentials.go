package services

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
)

// CredentialService handles operations related to system tokens
type CredentialService struct {
	client *client.Client
}

// NewCredentialService creates a new instance of CredentialService
func NewCredentialService(client *client.Client) *CredentialService {
	return &CredentialService{
		client: client,
	}
}

// GetSystemTokens retrieves the user's system tokens
func (s *CredentialService) GetSystemTokens() ([]models.SystemToken, *client.IrminAPIResponse, error) {
	var tokens []models.SystemToken
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/credentials",
	}, &tokens)
	if err != nil {
		return nil, nil, fmt.Errorf("get system tokens error: %w", err)
	}
	return tokens, apiResp, nil
}

// CreateSystemToken creates a new system token
func (s *CredentialService) CreateSystemToken(name string, expiry int) (*models.SystemToken, *client.IrminAPIResponse, error) {
	form := map[string]string{
		"name":   name,
		"expiry": fmt.Sprintf("%d", expiry),
	}

	var token models.SystemToken
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/credentials",
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &token)
	if err != nil {
		return nil, nil, fmt.Errorf("create system token error: %w", err)
	}
	return &token, apiResp, nil
}

// RevokeSystemToken revokes a system token
func (s *CredentialService) RevokeSystemToken(tokenID string) (*client.IrminAPIResponse, error) {
	form := map[string]string{
		"_method": "DELETE",
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/credentials/%s", tokenID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("revoke system token error: %w", err)
	}
	return apiResp, nil
}
