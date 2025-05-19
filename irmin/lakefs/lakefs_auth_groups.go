package lakefs

import (
	"fmt"
	"net/http"
)

// Group represents a group of users in LakeFS.
type Group struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	CreationDate int64  `json:"creation_date"` // Unix Epoch in seconds of the group creation date.
}

// GroupList represents a list of groups.
type GroupList struct {
	Pagination Pagination `json:"pagination"`
	Results    []Group    `json:"results"`
}

// GroupCreateRequest represents the request body for creating a new group.
type GroupCreateRequest struct {
	ID          string `json:"id"`
	Description string `json:"description"`
}

// ListGroups retrieves a single page of groups.
func (c *Client) ListGroups(prefix, after string, amount int) (*GroupList, error) {
	endpoint := fmt.Sprintf("/auth/groups?prefix=%s&after=%s&amount=%d", prefix, after, amount)
	var listResp GroupList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllGroups handles pagination automatically and returns all groups.
func (c *Client) ListAllGroups(prefix string) ([]Group, error) {
	var allGroups []Group
	after := ""
	for {
		listResp, err := c.ListGroups(prefix, after, DefaultListAmountLimit)
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

// CreateGroup creates a new group using the provided request data.
func (c *Client) CreateGroup(reqData GroupCreateRequest) (*Group, error) {
	var group Group
	if err := c.doRequest("POST", "/auth/groups", reqData, []int{http.StatusCreated}, &group); err != nil {
		return nil, err
	}
	return &group, nil
}

// GetGroup fetches a single group by its ID.
func (c *Client) GetGroup(groupID string) (*Group, error) {
	var group Group
	endpoint := fmt.Sprintf("/auth/groups/%s", groupID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &group); err != nil {
		return nil, err
	}
	return &group, nil
}

// DeleteGroup deletes the group identified by groupID.
func (c *Client) DeleteGroup(groupID string) error {
	endpoint := fmt.Sprintf("/auth/groups/%s", groupID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// ListGroupMembers retrieves a single page of members for a specific group.
func (c *Client) ListGroupMembers(groupID, after string, amount int) (*UserList, error) {
	endpoint := fmt.Sprintf("/auth/groups/%s/members?after=%s&amount=%d", groupID, after, amount)
	var listResp UserList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllGroupMembers handles pagination automatically and returns all members for a specific group.
func (c *Client) ListAllGroupMembers(groupID string) ([]User, error) {
	var allMembers []User
	after := ""
	for {
		listResp, err := c.ListGroupMembers(groupID, after, DefaultListAmountLimit)
		if err != nil {
			return nil, err
		}
		allMembers = append(allMembers, listResp.Results...)
		if !listResp.Pagination.HasMore {
			break
		}
		after = listResp.Pagination.NextOffset
	}
	return allMembers, nil
}

// AddUserToGroup adds a user to a group.
func (c *Client) AddUserToGroup(groupID, userID string) error {
	endpoint := fmt.Sprintf("/auth/groups/%s/members/%s", groupID, userID)
	return c.doRequest("PUT", endpoint, nil, []int{http.StatusOK, http.StatusCreated}, nil)
}

// DeleteUserFromGroup removes a user from a group.
func (c *Client) DeleteUserFromGroup(groupID, userID string) error {
	endpoint := fmt.Sprintf("/auth/groups/%s/members/%s", groupID, userID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}

// ListGroupPolicies retrieves a single page of policies for a specific group.
func (c *Client) ListGroupPolicies(groupID, after string, amount int) (*PolicyList, error) {
	endpoint := fmt.Sprintf("/auth/groups/%s/policies?after=%s&amount=%d", groupID, after, amount)
	var listResp PolicyList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllGroupPolicies handles pagination automatically and returns all policies for a specific group.
func (c *Client) ListAllGroupPolicies(groupID string) ([]Policy, error) {
	var allPolicies []Policy
	after := ""
	for {
		listResp, err := c.ListGroupPolicies(groupID, after, DefaultListAmountLimit)
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

// AttachPolicyToGroup attaches a policy to a group.
func (c *Client) AttachPolicyToGroup(groupID, policyID string) error {
	endpoint := fmt.Sprintf("/auth/groups/%s/policies/%s", groupID, policyID)
	return c.doRequest("PUT", endpoint, nil, []int{http.StatusOK, http.StatusCreated}, nil)
}

// DetachPolicyFromGroup detaches a policy from a group.
func (c *Client) DetachPolicyFromGroup(groupID, policyID string) error {
	endpoint := fmt.Sprintf("/auth/groups/%s/policies/%s", groupID, policyID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}
