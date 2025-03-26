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

func (s *RoleService) ListRoles() ([]irminModels.IrminRole, *irminModels.IrminAPIResponse, error) {
	var roles []irminModels.IrminRole
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/roles",
	}, &roles)
	if err != nil {
		return nil, nil, fmt.Errorf("list roles error: %w", err)
	}
	return roles, apiResp, nil
}
