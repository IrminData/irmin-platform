package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// PolicyCreateParams represents the parameters required to create a new policy.
type PolicyCreateParams struct {
	// Required fields
	Effect    irminmodels.PolicyEffect    `form:"effect"`    // The effect of the policy (allow/deny)
	Action    irminmodels.PolicyAction    `form:"action"`    // The action being controlled (read/write/etc)
	Resource  irminmodels.PolicyResource  `form:"resource"`  // The resource type being controlled
	Principal irminmodels.PolicyPrincipal `form:"principal"` // The principal type (role/user)

	// Optional fields
	ResourceID *string `form:"resource_id,omitempty"` // ID of the specific resource
	RoleID     *string `form:"role_id,omitempty"`     // ID of the role if principal is role
	UserID     *string `form:"user_id,omitempty"`     // ID of the user if principal is user
}

// PolicyUpdateParams represents the parameters that can be updated for a policy.
type PolicyUpdateParams struct {
	// All fields are optional for updates
	Effect     *irminmodels.PolicyEffect    `form:"effect,omitempty"`      // The effect of the policy (allow/deny)
	Action     *irminmodels.PolicyAction    `form:"action,omitempty"`      // The action being controlled (read/write/etc)
	Resource   *irminmodels.PolicyResource  `form:"resource,omitempty"`    // The resource type being controlled
	Principal  *irminmodels.PolicyPrincipal `form:"principal,omitempty"`   // The principal type (role/user)
	ResourceID *string                      `form:"resource_id,omitempty"` // ID of the specific resource
	RoleID     *string                      `form:"role_id,omitempty"`     // ID of the role if principal is role
	UserID     *string                      `form:"user_id,omitempty"`     // ID of the user if principal is user
}

// ListPolicies returns a list of all policies for a workspace.
func (c *Client) ListPolicies(workspace string) ([]irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	var policies []irminmodels.Policy
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/policies", workspace),
	}, &policies)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch policies error: %w", err)
	}
	return policies, apiResp, nil
}

// GetPolicy returns a single policy.
func (c *Client) GetPolicy(workspace, policyID string) (*irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	var policy irminmodels.Policy
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/policies/%s", workspace, policyID),
	}, &policy)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch policy error: %w", err)
	}
	return &policy, apiResp, nil
}

// CreatePolicy creates a new policy for a workspace.
func (c *Client) CreatePolicy(
	workspace string,
	params PolicyCreateParams,
) (*irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	fields := map[string]string{
		"effect":    string(params.Effect),
		"action":    string(params.Action),
		"resource":  string(params.Resource),
		"principal": string(params.Principal),
	}

	if params.ResourceID != nil {
		fields["resource_id"] = *params.ResourceID
	}
	if params.RoleID != nil {
		fields["role_id"] = *params.RoleID
	}
	if params.UserID != nil {
		fields["user_id"] = *params.UserID
	}

	var policy irminmodels.Policy
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/policies", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  fields,
	}, &policy)
	if err != nil {
		return nil, nil, fmt.Errorf("create policy error: %w", err)
	}
	return &policy, apiResp, nil
}

// UpdatePolicy updates an existing policy.
func (c *Client) UpdatePolicy(
	workspace, policyID string,
	params PolicyUpdateParams,
) (*irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	fields := make(map[string]string)

	if params.Effect != nil {
		fields["effect"] = string(*params.Effect)
	}
	if params.Action != nil {
		fields["action"] = string(*params.Action)
	}
	if params.Resource != nil {
		fields["resource"] = string(*params.Resource)
	}
	if params.Principal != nil {
		fields["principal"] = string(*params.Principal)
	}
	if params.ResourceID != nil {
		fields["resource_id"] = *params.ResourceID
	}
	if params.RoleID != nil {
		fields["role_id"] = *params.RoleID
	}
	if params.UserID != nil {
		fields["user_id"] = *params.UserID
	}

	var policy irminmodels.Policy
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/policies/%s", workspace, policyID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  fields,
	}, &policy)
	if err != nil {
		return nil, nil, fmt.Errorf("update policy error: %w", err)
	}
	return &policy, apiResp, nil
}

// DeletePolicy deletes a policy.
func (c *Client) DeletePolicy(workspace, policyID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/policies/%s", workspace, policyID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete policy error: %w", err)
	}
	return apiResp, nil
}

// GetPolicyRoleSummary returns a list of policies that apply to a role.
func (c *Client) GetPolicyRoleSummary(
	workspace string,
) ([]irminmodels.RolePolicySummary, *irminmodels.IrminAPIResponse, error) {
	var rolePolicySummaries []irminmodels.RolePolicySummary
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/policies/role-summary", workspace),
	}, &rolePolicySummaries)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch role policies error: %w", err)
	}
	return rolePolicySummaries, apiResp, nil
}

// GetPolicyUserSummary returns a list of policies that apply to a user.
func (c *Client) GetPolicyUserSummary(
	workspace string,
) (*irminmodels.UserPolicySummary, *irminmodels.IrminAPIResponse, error) {
	var userPolicySummary irminmodels.UserPolicySummary
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/policies/my", workspace),
	}, &userPolicySummary)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch user policies error: %w", err)
	}
	return &userPolicySummary, apiResp, nil
}

// CheckPermission checks if a user has permission to perform an action on a resource.
func (c *Client) CheckPermission(
	workspace string,
	resource irminmodels.PolicyResource,
	action irminmodels.PolicyAction,
	resourceID *string,
) (bool, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/policies/can?resource=%s&action=%s", workspace, resource, action)
	if resourceID != nil {
		endpoint += fmt.Sprintf("&resource_id=%s", *resourceID)
	}

	_, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, nil)
	if err != nil {
		return false, fmt.Errorf("check permission error: %w", err)
	}
	return true, nil
}
