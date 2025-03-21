package irminCore

import (
	"fmt"
	"net/http"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// CredentialService handles operations related to system tokens
type CredentialService struct {
	client *Client
}

// NewCredentialService creates a new instance of CredentialService
func NewCredentialService(client *Client) *CredentialService {
	return &CredentialService{
		client: client,
	}
}

// GetSystemTokens retrieves the user's system tokens
func (s *CredentialService) GetSystemTokens() ([]irminModels.SystemToken, *irminModels.IrminAPIResponse, error) {
	var tokens []irminModels.SystemToken
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/credentials",
	}, &tokens)
	if err != nil {
		return nil, nil, fmt.Errorf("get system tokens error: %w", err)
	}
	return tokens, apiResp, nil
}

// CreateSystemToken creates a new system token
func (s *CredentialService) CreateSystemToken(name string, expiry int) (*irminModels.SystemToken, *irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"name":   name,
		"expiry": strconv.FormatInt(int64(expiry), 10),
	}

	var token irminModels.SystemToken
	apiResp, err := s.client.FetchAPI(RequestOptions{
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
func (s *CredentialService) RevokeSystemToken(tokenID string) (*irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"_method": "DELETE",
	}

	apiResp, err := s.client.FetchAPI(RequestOptions{
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
