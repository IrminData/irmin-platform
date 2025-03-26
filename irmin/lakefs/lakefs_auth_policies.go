package lakefs

import (
	"fmt"
	"net/http"
)

// PolicyStatementEffect represents the effect of a policy statement.
type PolicyStatementEffect string

const (
	// PolicyStatementEffectAllow represents an allow effect in a policy statement.
	PolicyStatementEffectAllow PolicyStatementEffect = "allow"
	// PolicyStatementEffectDeny represents a deny effect in a policy statement.
	PolicyStatementEffectDeny PolicyStatementEffect = "deny"
)

// PolicyStatement represents a statement in a policy.
type PolicyStatement struct {
	Effect   PolicyStatementEffect `json:"effect"`
	Resource string                `json:"resource"`
	Action   []string              `json:"action"`
}

// Policy represents a policy in LakeFS.
type Policy struct {
	ID           string `json:"id"`
	CreationDate int64  `json:"creation_date"` // Unix Epoch in seconds of the policy creation date.
}

// PolicyList represents a list of policies.
type PolicyList struct {
	Pagination Pagination `json:"pagination"`
	Results    []Policy   `json:"results"`
}

// ListPolicies retrieves a single page of policies.
func (c *Client) ListPolicies(prefix, after string, amount int) (*PolicyList, error) {
	endpoint := fmt.Sprintf("/auth/policies?prefix=%s&after=%s&amount=%d", prefix, after, amount)
	var listResp PolicyList
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &listResp); err != nil {
		return nil, err
	}
	return &listResp, nil
}

// ListAllPolicies handles pagination automatically and returns all policies.
func (c *Client) ListAllPolicies(prefix string) ([]Policy, error) {
	var allPolicies []Policy
	after := ""
	for {
		listResp, err := c.ListPolicies(prefix, after, 100)
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

// CreatePolicy creates a new policy using the provided request data.
func (c *Client) CreatePolicy(reqData Policy) (*Policy, error) {
	var policy Policy
	if err := c.doRequest("POST", "/auth/policies", reqData, []int{http.StatusCreated}, &policy); err != nil {
		return nil, err
	}
	return &policy, nil
}

// GetPolicy fetches a single policy by its ID.
func (c *Client) GetPolicy(policyID string) (*Policy, error) {
	var policy Policy
	endpoint := fmt.Sprintf("/auth/policies/%s", policyID)
	if err := c.doRequest("GET", endpoint, nil, []int{http.StatusOK}, &policy); err != nil {
		return nil, err
	}
	return &policy, nil
}

// UpdatePolicy updates the policy identified by policyID with the provided request data.
func (c *Client) UpdatePolicy(policyID string, reqData Policy) (*Policy, error) {
	var policy Policy
	endpoint := fmt.Sprintf("/auth/policies/%s", policyID)
	if err := c.doRequest("PUT", endpoint, reqData, []int{http.StatusOK}, &policy); err != nil {
		return nil, err
	}
	return &policy, nil
}

// DeletePolicy deletes the policy identified by policyID.
func (c *Client) DeletePolicy(policyID string) error {
	endpoint := fmt.Sprintf("/auth/policies/%s", policyID)
	return c.doRequest("DELETE", endpoint, nil, []int{http.StatusOK, http.StatusNoContent}, nil)
}
