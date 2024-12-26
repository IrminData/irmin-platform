package services

import (
	"encoding/json"
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"net/http"
	"os"
)

// ProfileService wraps operations on the user profile
type ProfileService struct {
	client *client.Client
}

// NewProfileService creates a new ProfileService
func NewProfileService(client *client.Client) *ProfileService {
	return &ProfileService{
		client: client,
	}
}

// GetProfile fetches the current user's profile
func (s *ProfileService) GetProfile() (*models.User, error) {
	resp, err := s.client.Request(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/profile",
	})
	if err != nil {
		return nil, fmt.Errorf("fetch profile error: %w", err)
	}

	var profile models.User
	if err := json.Unmarshal(resp, &profile); err != nil {
		return nil, fmt.Errorf("parse profile error: %w", err)
	}
	return &profile, nil
}

// UpdateProfile updates the user's profile fields and optionally uploads an avatar image
func (s *ProfileService) UpdateProfile(firstName, lastName, email, phone, company string, avatar *os.File) (*models.User, error) {
	// Build form fields for multipart data
	formFields := map[string]string{
		"_method":    "PATCH",
		"first_name": firstName,
		"last_name":  lastName,
		"email":      email,
		"phone":      phone,
		"company":    company,
	}

	// Prepare file attachments if avatar is provided
	var files []client.FormFile
	if avatar != nil {
		files = append(files, client.FormFile{
			FieldName: "avatar",
			Reader:    avatar,
			FileName:  avatar.Name(),
		})
	}

	// Perform the request using multipart/form-data
	resp, err := s.client.Request(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/profile",
		ContentType: "multipart/form-data",
		FormFields:  formFields,
		Files:       files,
	})
	if err != nil {
		return nil, fmt.Errorf("update profile error: %w", err)
	}

	var profile models.User
	if err := json.Unmarshal(resp, &profile); err != nil {
		return nil, fmt.Errorf("parse profile error: %w", err)
	}
	return &profile, nil
}
