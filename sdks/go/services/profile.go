package services

import (
	"fmt"
	"net/http"
	"os"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/models"
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
// Returns the user struct and the full IrminAPIResponse for inspection (e.g. message, errors, metadata).
func (s *ProfileService) GetProfile() (*models.User, *client.IrminAPIResponse, error) {
	var profile models.User

	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/profile",
	}, &profile)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch profile error: %w", err)
	}

	return &profile, apiResp, nil
}

// UpdateProfile updates the user's profile fields and optionally uploads an avatar image.
// Returns the updated user struct, plus the IrminAPIResponse object.
func (s *ProfileService) UpdateProfile(
	firstName, lastName, email, phone, company string,
	avatar *os.File,
) (*models.User, *client.IrminAPIResponse, error) {

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

	// We'll parse the updated user from the `Data` field
	var updatedProfile models.User

	// Call FetchAPI with multipart/form-data
	apiResp, err := s.client.FetchAPI(client.RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/profile",
		ContentType: "multipart/form-data",
		FormFields:  formFields,
		Files:       files,
	}, &updatedProfile)
	if err != nil {
		return nil, nil, fmt.Errorf("update profile error: %w", err)
	}

	return &updatedProfile, apiResp, nil
}
