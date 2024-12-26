package services

import (
	"encoding/json"
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
)

// UserService wraps operations on the user profile
type UserService struct {
	client *client.Client
}

// NewUserService creates a new UserService
func NewUserService(client *client.Client) *UserService {
	return &UserService{
		client: client,
	}
}

// FetchWorkspaceUsers fetches all users in the current workspace
func (s *UserService) FetchWorkspaceUsers() ([]models.User, error) {
	resp, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/users",
	})
	if err != nil {
		return nil, fmt.Errorf("fetch users error: %w", err)
	}

	var users []models.User
	if err := json.Unmarshal(resp, &users); err != nil {
		return nil, fmt.Errorf("parse users error: %w", err)
	}
	return users, nil
}

// FetchUser fetches a user by ID
func (s *UserService) FetchUser(userID string) (*models.User, error) {
	resp, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/users/%s", userID),
	})
	if err != nil {
		return nil, fmt.Errorf("fetch user error: %w", err)
	}

	var user models.User
	if err := json.Unmarshal(resp, &user); err != nil {
		return nil, fmt.Errorf("parse user error: %w", err)
	}
	return &user, nil
}

// ChangeUserRole changes the role of a user in the current workspace
func (s *UserService) ChangeUserRole(userID, role string) error {
	body := map[string]string{
		"_method": "PATCH",
		"roles":   role,
	}

	_, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/users/%s", userID),
		Body:     body,
	})
	if err != nil {
		return fmt.Errorf("change role error: %w", err)
	}
	return nil
}

// RemoveUserFromWorkspace removes a user from the current workspace
func (s *UserService) RemoveUserFromWorkspace(userID string) error {
	body := map[string]string{
		"_method": "DELETE",
	}

	_, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/users/%s", userID),
		Body:     body,
	})
	if err != nil {
		return fmt.Errorf("remove user error: %w", err)
	}
	return nil
}
