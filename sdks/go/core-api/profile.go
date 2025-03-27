package irminCore

import (
	"fmt"
	"net/http"
	"os"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) GetProfile() (*irminModels.User, *irminModels.IrminAPIResponse, error) {
	var profile irminModels.User
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/profile",
	}, &profile)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch profile error: %w", err)
	}
	return &profile, apiResp, nil
}

func (c *Client) UpdateProfile(firstName, lastName, email, phone, company string, profilePicture *os.File) (*irminModels.User, *irminModels.IrminAPIResponse, error) {
	var files []FormFile
	if profilePicture != nil {
		files = append(files, FormFile{
			FieldName: "profile_picture",
			Reader:    profilePicture,
			FileName:  profilePicture.Name(),
		})
	}

	var updatedProfile irminModels.User
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    "/v1/profile",
		ContentType: "multipart/form-data",
		FormFields: map[string]string{
			"first_name": firstName,
			"last_name":  lastName,
			"email":      email,
			"phone":      phone,
			"company":    company,
		},
		Files: files,
	}, &updatedProfile)
	if err != nil {
		return nil, nil, fmt.Errorf("update profile error: %w", err)
	}

	return &updatedProfile, apiResp, nil
}
