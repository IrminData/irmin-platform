package lakefs

import (
	"net/http"
)

// LoginRequest represents the request body for  sign in.
type LoginRequest struct {
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
}

// LoginResponse represents the response from  after signing in.
type LoginResponse struct {
	Token           string `json:"token"`
	TokenExpiration int    `json:"token_expiration"`
}

// CurrentUser represents the current user in LakeFS.
type CurrentUser struct {
	User User `json:"user"` // The user object representing the current user.
}

// Login authenticates with  using the provided credentials and stores the auth token.
func (c *Client) Login(accessKey, secretKey string) error {
	loginReq := LoginRequest{
		AccessKeyID:     accessKey,
		SecretAccessKey: secretKey,
	}
	var loginResp LoginResponse
	if err := c.doRequest("POST", "/auth/login", loginReq, []int{http.StatusOK}, &loginResp); err != nil {
		return err
	}

	// Store the token for future requests.
	c.token = loginResp.Token
	return nil
}

// GetCurrentUser fetches the current user's information.
func (c *Client) GetCurrentUser() (*CurrentUser, error) {
	var user CurrentUser
	if err := c.doRequest("GET", "/user", nil, []int{http.StatusOK}, &user); err != nil {
		return nil, err
	}
	return &user, nil
}
