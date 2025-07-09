package irmincore

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// UpdateProfileRequest represents the JSON request body for updating profile.
type UpdateProfileRequest struct {
	FirstName string `json:"first_name,omitempty" validate:"min=1,max=50"`
	LastName  string `json:"last_name,omitempty"  validate:"min=1,max=50"`
	Email     string `json:"email,omitempty"      validate:"email"`
	Phone     string `json:"phone,omitempty"      validate:"validphone"`
	Company   string `json:"company,omitempty"    validate:"max=100"`
}

func (c *Client) GetProfile() (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	var profile irminmodels.User
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/profile",
	}, &profile)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch profile error: %w", err)
	}
	return &profile, apiResp, nil
}

func (c *Client) UpdateProfile(
	firstName, lastName, email, phone, company string,
	profilePicture *os.File,
) (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	// Create update request struct with only non-empty fields
	updateReq := UpdateProfileRequest{}
	if firstName != "" {
		updateReq.FirstName = firstName
	}
	if lastName != "" {
		updateReq.LastName = lastName
	}
	if email != "" {
		updateReq.Email = email
	}
	if phone != "" {
		updateReq.Phone = phone
	}
	if company != "" {
		updateReq.Company = company
	}

	var updatedProfile irminmodels.User
	var apiResp *irminmodels.IrminAPIResponse
	var err error

	// If profile picture is provided, use multipart form data
	if profilePicture != nil {
		files := []FormFile{
			{
				FieldName: "profile_picture",
				Reader:    profilePicture,
				FileName:  profilePicture.Name(),
			},
		}

		// Convert struct to JSON string for metadata field
		metadata, marshalErr := json.Marshal(updateReq)
		if marshalErr != nil {
			return nil, nil, fmt.Errorf("marshal update request error: %w", marshalErr)
		}

		apiResp, err = c.FetchAPI(RequestOptions{
			Method:      http.MethodPatch,
			Endpoint:    "/v1/profile",
			ContentType: "multipart/form-data",
			FormFields: map[string]string{
				"metadata": string(metadata),
			},
			Files: files,
		}, &updatedProfile)
	} else {
		// If no profile picture, use JSON content type
		apiResp, err = c.FetchAPI(RequestOptions{
			Method:      http.MethodPatch,
			Endpoint:    "/v1/profile",
			ContentType: "application/json",
			Body:        updateReq,
		}, &updatedProfile)
	}

	if err != nil {
		return nil, nil, fmt.Errorf("update profile error: %w", err)
	}

	return &updatedProfile, apiResp, nil
}
