package services

import (
	"fmt"
	"net/http"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
)

// UserService wraps operations on the user profile
type UserService struct {
	client *client.Client
}

// NewUserService creates a new UserService
func NewUserService(client *client.Client) *UserService {
	return &UserService{client: client}
}

// FetchWorkspaceUsers fetches all users in the current workspace.
// Returns a list of users, the full response, and an error if any.
func (s *UserService) FetchWorkspaceUsers() ([]models.User, *client.IrminAPIResponse, error) {
	var users []models.User

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/users",
	}, &users)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch users error: %w", err)
	}

	return users, apiResp, nil
}

// FetchUser fetches a user by ID.
// Returns the user object, the full response, and an error if any.
func (s *UserService) FetchUser(userID string) (*models.User, *client.IrminAPIResponse, error) {
	var user models.User

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/users/%s", userID),
	}, &user)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch user error: %w", err)
	}

	return &user, apiResp, nil
}

// ChangeUserRole changes the role of a user in the current workspace.
// The API endpoint does not return meaningful data, so we just return the response object for consistency.
func (s *UserService) ChangeUserRole(userID, role string) (*client.IrminAPIResponse, error) {
	body := map[string]string{
		"_method": "PATCH",
		"roles":   role,
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/users/%s", userID),
		Body:     body,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("change role error: %w", err)
	}

	return apiResp, nil
}

// RemoveUserFromWorkspace removes a user from the current workspace.
// Again, no data is returned, so we only return the response object.
func (s *UserService) RemoveUserFromWorkspace(userID string) (*client.IrminAPIResponse, error) {
	body := map[string]string{
		"_method": "DELETE",
	}

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/users/%s", userID),
		Body:     body,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("remove user error: %w", err)
	}

	return apiResp, nil
}
