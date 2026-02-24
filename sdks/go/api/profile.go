package irmincore

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// UpdateProfileRequest represents the JSON request body for updating profile.
type UpdateProfileRequest struct {
	FirstName *string `json:"first_name,omitempty" validate:"omitnil,max=50"     example:"John"`
	LastName  *string `json:"last_name,omitempty"  validate:"omitnil,max=50"     example:"Doe"`
	Email     *string `json:"email,omitempty"      validate:"omitnil,email"      example:"john.doe@example.com"`
	Phone     *string `json:"phone,omitempty"      validate:"omitnil,validphone" example:"+1234567890"`
	Company   *string `json:"company,omitempty"    validate:"omitnil,max=100"    example:"Irmin"`
	Language  *string `json:"language,omitempty"   validate:"omitnil,max=5"      example:"en"`
}

func (c *Client) GetProfile(ctx context.Context) (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	var profile irminmodels.User
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/profile",
	}, &profile)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch profile error: %w", err)
	}
	return &profile, apiResp, nil
}

func (c *Client) UpdateProfile(
	ctx context.Context,
	firstName, lastName, email, phone, company, language *string,
	profilePicture *os.File,
) (*irminmodels.User, *irminmodels.IrminAPIResponse, error) {
	// Create update request struct with only non-empty fields
	updateReq := UpdateProfileRequest{}
	if firstName != nil && *firstName != "" {
		updateReq.FirstName = firstName
	}
	if lastName != nil && *lastName != "" {
		updateReq.LastName = lastName
	}
	if email != nil && *email != "" {
		updateReq.Email = email
	}
	if phone != nil && *phone != "" {
		updateReq.Phone = phone
	}
	if company != nil && *company != "" {
		updateReq.Company = company
	}
	if language != nil && *language != "" {
		updateReq.Language = language
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

		apiResp, err = c.FetchAPI(ctx, RequestOptions{
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
		apiResp, err = c.FetchAPI(ctx, RequestOptions{
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
