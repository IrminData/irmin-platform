package irmincore

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// ListPoliciesParams represents the parameters for listing policies.
type ListPoliciesParams struct {
	Effect     *irminmodels.PolicyEffect    `form:"effect,omitempty"`      // The effect of the policy (allow/deny)
	Action     *irminmodels.PolicyAction    `form:"action,omitempty"`      // The action being controlled (read/write/etc)
	Resource   *irminmodels.PolicyResource  `form:"resource,omitempty"`    // The resource type being controlled
	Principal  *irminmodels.PolicyPrincipal `form:"principal,omitempty"`   // The principal type (role/user)
	ResourceID *string                      `form:"resource_id,omitempty"` // ID of the specific resource
	RoleID     *string                      `form:"role_id,omitempty"`     // ID of the role if principal is role
	UserID     *string                      `form:"user_id,omitempty"`     // ID of the user if principal is user
}

// CreatePolicyRequest represents the JSON request body for creating a policy.
type CreatePolicyRequest struct {
	Effect     irminmodels.PolicyEffect    `json:"effect"                validate:"required,oneof=allow deny"                                                                                                                                                                                                      example:"allow"`
	Action     irminmodels.PolicyAction    `json:"action"                validate:"required,oneof=create read update delete"                                                                                                                                                                                       example:"read"`
	Resource   irminmodels.PolicyResource  `json:"resource"              validate:"required,oneof=workspace editor_script query workflow workflow_run connection repository repository_branch repository_tag repository_commit repository_object user policy invite audit_log documentation billing workspace_tag" example:"repository"`
	Principal  irminmodels.PolicyPrincipal `json:"principal"             validate:"required,oneof=workspace_user role everyone"                                                                                                                                                                                    example:"role"`
	ResourceID *string                     `json:"resource_id,omitempty"                                                                                                                                                                                                                                           example:"repo_8x2m9k4n7p5q"`
	RoleID     *string                     `json:"role_id,omitempty"     validate:"required_if=Principal role,validsqid=roles"                                                                                                                                                                                     example:"role_2a8m5x9n4p7s"`
	UserID     *string                     `json:"user_id,omitempty"     validate:"required_if=Principal workspace_user,validsqid=users"                                                                                                                                                                           example:"usr_2k8n9q1m7p3x4z"`
}

// UpdatePolicyRequest represents the JSON request body for updating a policy.
type UpdatePolicyRequest struct {
	Effect     irminmodels.PolicyEffect    `json:"effect,omitempty"      validate:"omitempty,oneof=allow deny"                                                                                                                                                                                                      example:"allow"`
	Action     irminmodels.PolicyAction    `json:"action,omitempty"      validate:"omitempty,oneof=create read update delete"                                                                                                                                                                                       example:"read"`
	Resource   irminmodels.PolicyResource  `json:"resource,omitempty"    validate:"omitempty,oneof=workspace editor_script query workflow workflow_run connection repository repository_branch repository_tag repository_commit repository_object user policy invite audit_log documentation billing workspace_tag" example:"repository"`
	Principal  irminmodels.PolicyPrincipal `json:"principal,omitempty"   validate:"omitempty,oneof=workspace_user role everyone"                                                                                                                                                                                    example:"role"`
	ResourceID *string                     `json:"resource_id,omitempty"                                                                                                                                                                                                                                            example:"repo_8x2m9k4n7p5q"`
	RoleID     *string                     `json:"role_id,omitempty"     validate:"omitnil,required_if=Principal role,validsqid=roles"                                                                                                                                                                              example:"role_2a8m5x9n4p7s"`
	UserID     *string                     `json:"user_id,omitempty"     validate:"omitnil,required_if=Principal workspace_user,validsqid=users"                                                                                                                                                                    example:"usr_2k8n9q1m7p3x4z"`
}

// ListPolicies returns a list of all policies for a workspace.
func (c *Client) ListPolicies(
	ctx context.Context,
	workspace string,
	params ListPoliciesParams,
) ([]irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	// Build query parameters
	queryParams := url.Values{}
	if params.Effect != nil {
		queryParams.Add("effect", string(*params.Effect))
	}
	if params.Action != nil {
		queryParams.Add("action", string(*params.Action))
	}
	if params.Resource != nil {
		queryParams.Add("resource", string(*params.Resource))
	}
	if params.Principal != nil {
		queryParams.Add("principal", string(*params.Principal))
	}
	if params.ResourceID != nil {
		queryParams.Add("resource_id", *params.ResourceID)
	}
	if params.RoleID != nil {
		queryParams.Add("role_id", *params.RoleID)
	}
	if params.UserID != nil {
		queryParams.Add("user_id", *params.UserID)
	}

	// Fetch policies
	var policies []irminmodels.Policy
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/policies?%s", workspace, queryParams.Encode()),
	}, &policies)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch policies error: %w", err)
	}
	return policies, apiResp, nil
}

// GetPolicy returns a single policy.
func (c *Client) GetPolicy(
	ctx context.Context,
	workspace, policyID string,
) (*irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	var policy irminmodels.Policy
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
	ctx context.Context,
	workspace string,
	req CreatePolicyRequest,
) (*irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	var policy irminmodels.Policy
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/policies", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &policy)
	if err != nil {
		return nil, nil, fmt.Errorf("create policy error: %w", err)
	}
	return &policy, apiResp, nil
}

// UpdatePolicy updates an existing policy.
func (c *Client) UpdatePolicy(
	ctx context.Context,
	workspace, policyID string,
	req UpdatePolicyRequest,
) (*irminmodels.Policy, *irminmodels.IrminAPIResponse, error) {
	var policy irminmodels.Policy
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/policies/%s", workspace, policyID),
		ContentType: "application/json",
		Body:        req,
	}, &policy)
	if err != nil {
		return nil, nil, fmt.Errorf("update policy error: %w", err)
	}
	return &policy, apiResp, nil
}

// DeletePolicy deletes a policy.
func (c *Client) DeletePolicy(ctx context.Context, workspace, policyID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
	ctx context.Context,
	workspace string,
) ([]irminmodels.RolePolicySummary, *irminmodels.IrminAPIResponse, error) {
	var rolePolicySummaries []irminmodels.RolePolicySummary
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
	ctx context.Context,
	workspace string,
) (*irminmodels.UserPolicySummary, *irminmodels.IrminAPIResponse, error) {
	var userPolicySummary irminmodels.UserPolicySummary
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
	ctx context.Context,
	workspace string,
	resource irminmodels.PolicyResource,
	action irminmodels.PolicyAction,
	resourceID *string,
) (bool, error) {
	endpoint := fmt.Sprintf("/v1/workspaces/%s/policies/can?resource=%s&action=%s", workspace, resource, action)
	if resourceID != nil {
		endpoint += fmt.Sprintf("&resource_id=%s", *resourceID)
	}

	_, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, nil)
	if err != nil {
		return false, fmt.Errorf("check permission error: %w", err)
	}
	return true, nil
}

// GetPolicyResourceOptions returns all possible policy resource options for a given workspace.
func (c *Client) GetPolicyResourceOptions(
	ctx context.Context,
	workspace string,
) (*irminmodels.PolicyResourceOptions, *irminmodels.IrminAPIResponse, error) {
	var policyResourceOptions irminmodels.PolicyResourceOptions
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/policies/resource-options", workspace),
	}, &policyResourceOptions)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch policy resource options error: %w", err)
	}
	return &policyResourceOptions, apiResp, nil
}
