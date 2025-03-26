package lakefs

import (
	"fmt"
	"net/http"
)

// User represents a user in LakeFS.
type User struct {
	ID           string `json:"id"`            // A unique identifier for the user. Cannot be edited.
	CreationDate int64  `json:"creation_date"` // Unix Epoch in seconds of the user creation date.
	FriendlyName string `json:"friendly_name"` // A shorter name for the user than the ID. Unlike ID it does not identify the user (it might not be unique).
	Email        string `json:"email"`         // The email address of the user.
}

// UserList represents a list of users.
type UserList struct {
	Pagination Pagination `json:"pagination"`
	Results    []User     `json:"results"`
}

// UserCreateRequest represents the request body for creating a new user.
type UserCreateRequest struct {
	ID         string `json:"id"` // A unique identifier for the user. Cannot be edited.
	InviteUser bool   `json:"invite_user"`
}

// UserCredentials represents the credentials of a user.
type UserCredentials struct {
	AccessKeyID     string  `json:"access_key_id"`
	SecretAccessKey *string `json:"secret_access_key"` // The secret access key of the credentials. Only returned when creating new credentials.
	CreationDate    int64   `json:"creation_date"`     // Unix Epoch in seconds of the credentials creation date.
}

// UserCredentialsList represents a list of user credentials.
type UserCredentialsList struct {
	Pagination Pagination        `json:"pagination"`
	Results    []UserCredentials `json:"results"`
}

// ListUsers retrieves a single page of users.
func (c *Client) ListUsers(prefix, after string, amount int) (*UserList, error) {
	endpoint := fmt.Sprintf("/auth/users?prefix=%s&after=%s&amount=%d", prefix, after, amount)
	var listResp UserList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllUsers handles pagination automatically and returns all users.
func (c *Client) ListAllUsers(prefix string) ([]User, error) {
	var allUsers []User
	after := ""
	for {
		listResp, err := c.ListUsers(prefix, after, 100)
		if err != nil {
			return nil, err
		}
		allUsers = append(allUsers, listResp.Results...)
		if !listResp.Pagination.HasMore {
			break
		}
		after = listResp.Pagination.NextOffset
	}
	return allUsers, nil
}

// CreateUser creates a new user using the provided request data.
func (c *Client) CreateUser(reqData UserCreateRequest) (*User, error) {
	var user User
	if err := c.doRequest("POST", "/auth/users", reqData, []int{http.StatusCreated}, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUser fetches a single user by its ID.
func (c *Client) GetUser(userID string) (*User, error) {
	var user User
	endpoint := fmt.Sprintf("/auth/users/%s", userID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// DeleteUser deletes the user identified by userID.
func (c *Client) DeleteUser(userID string) error {
	endpoint := fmt.Sprintf("/auth/users/%s", userID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// ListUserCredentials retrieves a single page of user credentials.
func (c *Client) ListUserCredentials(userID, after string, amount int) (*UserCredentialsList, error) {
	endpoint := fmt.Sprintf("/auth/users/%s/credentials?after=%s&amount=%d", userID, after, amount)
	var listResp UserCredentialsList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// CreateUserCredentials creates a new set of credentials for the user identified by userID.
func (c *Client) CreateUserCredentials(userID string) (*UserCredentials, error) {
	var credentials UserCredentials
	endpoint := fmt.Sprintf("/auth/users/%s/credentials", userID)
	if err := c.doRequest("POST", endpoint, nil, []int{http.StatusCreated}, &credentials); err != nil {
		return nil, err
	}
	return &credentials, nil
}

// DeleteUserCredentials deletes the credentials identified by accessKeyID.
func (c *Client) DeleteUserCredentials(userID, accessKeyID string) error {
	endpoint := fmt.Sprintf("/auth/users/%s/credentials/%s", userID, accessKeyID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// GetUserCredentials fetches a single set of credentials by its accessKeyID.
func (c *Client) GetUserCredentials(userID, accessKeyID string) (*UserCredentials, error) {
	var credentials UserCredentials
	endpoint := fmt.Sprintf("/auth/users/%s/credentials/%s", userID, accessKeyID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &credentials); err != nil {
		return nil, err
	}
	return &credentials, nil
}

// ListUserGroups retrieves a single page of groups for a specific user.
func (c *Client) ListUserGroups(userID, after string, amount int) (*GroupList, error) {
	endpoint := fmt.Sprintf("/auth/users/%s/groups?after=%s&amount=%d", userID, after, amount)
	var listResp GroupList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllUserGroups handles pagination automatically and returns all groups for a specific user.
func (c *Client) ListAllUserGroups(userID string) ([]Group, error) {
	var allGroups []Group
	after := ""
	for {
		listResp, err := c.ListUserGroups(userID, after, 100)
		if err != nil {
			return nil, err
		}
		allGroups = append(allGroups, listResp.Results...)
		if !listResp.Pagination.HasMore {
			break
		}
		after = listResp.Pagination.NextOffset
	}
	return allGroups, nil
}

// ListUserPolicies retrieves a single page of policies for a specific user.
func (c *Client) ListUserPolicies(userID, after string, amount int) (*PolicyList, error) {
	endpoint := fmt.Sprintf("/auth/users/%s/policies?after=%s&amount=%d", userID, after, amount)
	var listResp PolicyList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllUserPolicies handles pagination automatically and returns all policies for a specific user.
func (c *Client) ListAllUserPolicies(userID string) ([]Policy, error) {
	var allPolicies []Policy
	after := ""
	for {
		listResp, err := c.ListUserPolicies(userID, after, 100)
		if err != nil {
			return nil, err
		}
		allPolicies = append(allPolicies, listResp.Results...)
		if !listResp.Pagination.HasMore {
			break
		}
		after = listResp.Pagination.NextOffset
	}
	return allPolicies, nil
}

// AttachPolicyToUser attaches a policy to a user.
func (c *Client) AttachPolicyToUser(userID, policyID string) error {
	endpoint := fmt.Sprintf("/auth/users/%s/policies/%s", userID, policyID)
	return c.doRequest("PUT", endpoint, nil, []int{http.StatusOK, http.StatusCreated}, nil)
}

// DetachPolicyFromUser detaches a policy from a user.
func (c *Client) DetachPolicyFromUser(userID, policyID string) error {
	endpoint := fmt.Sprintf("/auth/users/%s/policies/%s", userID, policyID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}
