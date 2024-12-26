package services

import (
	"encoding/json"
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/models"
	"os"
)

type ProfileService struct {
	client *client.Client
}

func NewProfileService(client *client.Client) *ProfileService {
	return &ProfileService{
		client: client,
	}
}

func (s *ProfileService) GetProfile() (*models.User, error) {
	response, err := s.client.Request("GET", "/v1/profile", nil)
	if err != nil {
		return nil, fmt.Errorf("fetch profile error: %w", err)
	}

	var profile models.User
	err = json.Unmarshal(response, &profile)
	if err != nil {
		return nil, fmt.Errorf("parse profile error: %w", err)
	}

	return &profile, nil
}

func (s *ProfileService) UpdateProfile(firstName, lastName, email, phone, company string, avatar *os.File) (*models.User, error) {
	body := map[string]string{
		"_method":    "PATCH",
		"first_name": firstName,
		"last_name":  lastName,
		"email":      email,
		"phone":      phone,
		"company":    company,
	}

	// TODO: Upload avatar file

	response, err := s.client.Request("POST", "/v1/profile", body)
	if err != nil {
		return nil, fmt.Errorf("update profile error: %w", err)
	}

	var profile models.User
	err = json.Unmarshal(response, &profile)
	if err != nil {
		return nil, fmt.Errorf("parse profile error: %w", err)
	}

	return &profile, nil
}
