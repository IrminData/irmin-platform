package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// RoleService handles Role-related API calls
type RoleService struct {
	client *Client
}

// NewRoleService creates a new RoleService
func NewRoleService(client *Client) *RoleService {
	return &RoleService{
		client: client,
	}
}

// FetchRoles retrieves all available roles
func (s *RoleService) FetchRoles() ([]irminModels.IrminRole, *irminModels.IrminAPIResponse, error) {
	endpoint := "/v1/roles"
	var roles []irminModels.IrminRole

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &roles)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch roles error: %w", err)
	}
	return roles, apiResp, nil
}
