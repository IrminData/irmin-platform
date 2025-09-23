package controllers

import (
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// PoliciesIndex godoc
// @Summary List workspace policies
// @Description Get all policies for a workspace with optional filtering
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param effect query string false "Filter by policy effect (allow, deny)"
// @Param resource query string false "Filter by resource type"
// @Param resource_id query string false "Filter by specific resource ID (SQID)"
// @Param action query string false "Filter by action type"
// @Param principal query string false "Filter by principal type"
// @Param role_id query string false "Filter by role ID (SQID)"
// @Param user_id query string false "Filter by user ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Policy} "Policies retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid query parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies [get]
func (api *APIControllers) PoliciesIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse query parameters for filtering
	filters, err := utils.ParseQueryParams(
		c,
		nil,
		[]string{"effect", "resource", "resource_id", "action", "principal", "role_id", "user_id"},
	)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Construct the filters
	policyFilters := services.PolicyFilters{
		Effect:     filters["effect"],
		Resource:   filters["resource"],
		ResourceID: filters["resource_id"],
		Action:     filters["action"],
		Principal:  filters["principal"],
		RoleID:     filters["role_id"],
		UserID:     filters["user_id"],
	}

	// Get the policies
	policies, err := api.Services.GetPoliciesForWorkspace(c, user, workspace, policyFilters)
	if err != nil {
		api.Logger.Error("Error getting policies", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	policiesResponse, formatErr := formatter.FormatIndexResponse(
		policies,
		formatter.FormatPolicyResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting policies", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: policiesResponse,
	})
}

// PoliciesStore godoc
// @Summary Create policy
// @Description Create a new policy for a workspace
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.CreatePolicyRequest true "Policy creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Policy} "Policy created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or policy combination"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 409 {object} irminmodels.IrminAPIResponse "Conflict - policy already exists"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies [post]
//
//nolint:dupl // This is similar to other create endpoints
func (api *APIControllers) PoliciesStore(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.CreatePolicyRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create the policy
	policy, err := api.Services.CreatePolicy(c, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error creating policy", "error", err)
		if errors.Is(err, services.ErrPolicyAlreadyExists) {
			return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "policy_already_exists")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	policyResponse, formatPolicyErr := formatter.FormatPolicyResponse(policy, api.SQIDManager)
	if formatPolicyErr != nil {
		api.Logger.Error("Error formatting policy response", "error", formatPolicyErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate policies endpoints for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/policies", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_created"),
		Data:    policyResponse,
	})
}

// PoliciesShow godoc
// @Summary Get policy details
// @Description Get details of a specific policy by its ID
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param policy_id path string true "Policy ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Policy} "Policy retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Policy not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies/{policy_id} [get]
func (api *APIControllers) PoliciesShow(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the policy from the request context.
	policy, policyOk := c.Locals("policy").(*db.Policy)
	if !policyOk {
		api.Logger.Error("Error getting policy from request context", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the response
	policyResponse, formatPolicyErr := formatter.FormatPolicyResponse(policy, api.SQIDManager)
	if formatPolicyErr != nil {
		api.Logger.Error("Error formatting policy response", "error", formatPolicyErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: policyResponse,
	})
}

// PoliciesUpdate godoc
// @Summary Update policy
// @Description Update an existing policy's properties
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param policy_id path string true "Policy ID (SQID)"
// @Param request body irmincore.UpdatePolicyRequest true "Policy update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Policy} "Policy updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Policy not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies/{policy_id} [patch]
func (api *APIControllers) PoliciesUpdate(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the policy from the request context.
	policy, policyOk := c.Locals("policy").(*db.Policy)
	if !policyOk {
		api.Logger.Error("Error getting policy from request context", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.UpdatePolicyRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update the policy
	policy, err = api.Services.UpdatePolicy(c, user, workspace, policy, req)
	if err != nil {
		api.Logger.Error("Error updating policy", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	policyResponse, err := formatter.FormatPolicyResponse(policy, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting policy response", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate policies endpoints for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/policies", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_updated"),
		Data:    policyResponse,
	})
}

// PoliciesDestroy godoc
// @Summary Delete policy
// @Description Delete an existing policy from the workspace
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param policy_id path string true "Policy ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Policy deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Policy not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies/{policy_id} [delete]
func (api *APIControllers) PoliciesDestroy(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the policy from the request context.
	policy, policyOk := c.Locals("policy").(*db.Policy)
	if !policyOk {
		api.Logger.Error("Error getting policy from request context", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the policy
	err = api.Services.DeletePolicy(c, user, workspace, policy)
	if err != nil {
		api.Logger.Error("Error deleting policy", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate policies endpoints for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/policies", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_deleted"),
	})
}

// PoliciesResourceOptions godoc
// @Summary Get policy resource options
// @Description Get all available policy resource options for policy creation in the workspace
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=object} "Policy resource options retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies/resource-options [get]
func (api *APIControllers) PoliciesResourceOptions(c fiber.Ctx) error {
	_, dict, _, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Fetch the policy resource options
	queries, workflows, connections, repositories, tags, users, err := api.Services.GetPolicyResourceOptions(
		c,
		workspace,
	)
	if err != nil {
		api.Logger.Error("Error fetching resource data", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	policyResourceOptions, err := formatter.FormatPolicyResourceOptionsResponse(
		queries,
		workflows,
		connections,
		repositories,
		tags,
		users,
		api.SQIDManager,
	)
	if err != nil {
		api.Logger.Error("Error formatting policy resource options", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: policyResourceOptions,
	})
}

// PoliciesRoleSummary godoc
// @Summary Get role policy summary
// @Description Get a summary of all policies that apply to each role in the workspace
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.RolePolicySummary} "Role policy summary retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies/role-summary [get]
func (api *APIControllers) PoliciesRoleSummary(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		api.Logger.Error("Error validating local parameters in PoliciesRoleSummary")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the role policy summary
	rolePolicies, err := api.Services.GetPoliciesRoleSummary(c, workspace)
	if err != nil {
		api.Logger.Error("Error fetching role policies", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: rolePolicies,
	})
}

// PoliciesMySummary godoc
// @Summary Get my policy summary
// @Description Get a summary of all policies that apply to the current authenticated user
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.UserPolicySummary} "User policy summary retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/policies/my-summary [get]
func (api *APIControllers) PoliciesMySummary(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		api.Logger.Error("Error validating local parameters in PoliciesMySummary")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the policies for the user
	policies, workspaceUser, isOwner, err := api.Services.GetPoliciesForUser(c, workspace, user)
	if err != nil {
		api.Logger.Error("Error getting policies for user", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format policies
	formattedPolicies, err := formatter.FormatIndexResponse(policies, formatter.FormatPolicyResponse, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting policies", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get user roles
	roles := make([]string, 0, len(workspaceUser.Roles))
	for _, userRole := range workspaceUser.Roles {
		roleID, roleSQIDErr := api.SQIDManager.Encode("roles", uint64(userRole.Role.ID))
		if roleSQIDErr != nil {
			api.Logger.Error("Error encoding role ID", "error", roleSQIDErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		roles = append(roles, roleID)
	}

	// Encode user ID
	userID, err := api.SQIDManager.Encode("users", uint64(user.ID))
	if err != nil {
		api.Logger.Error("Error encoding user ID", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	summary := &irminmodels.UserPolicySummary{
		UserID:   userID,
		Email:    user.Email,
		IsOwner:  isOwner,
		RoleIDs:  roles,
		Policies: formattedPolicies,
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: summary,
	})
}

// CheckPermission godoc
// @Summary Check user permission
// @Description Check if the current user has permission to perform a specific action on a resource
// @Tags policies
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param resource query string true "Resource type to check permission for"
// @Param action query string true "Action to check permission for"
// @Param resource_id query string false "Specific resource ID (SQID) to check permission for"
// @Success 200 "Permission granted"
// @Failure 400 "Bad request - invalid query parameters"
// @Failure 401 "Unauthorized - invalid or missing authentication"
// @Failure 403 "Forbidden - permission denied"
// @Failure 500 "Internal server error"
// @Router /workspaces/{workspace_slug}/policies/check-permission [get]
func (api *APIControllers) CheckPermission(c fiber.Ctx) error {
	_, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		api.Logger.Error("Error validating local parameters in CheckPermission")
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	// Parse query parameters
	params, err := utils.ParseQueryParams(c, []string{"resource", "action"}, []string{"resource_id"})
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	// Check permission
	allowed, err := api.Services.CheckPolicyPermission(
		c,
		user,
		workspace,
		db.PolicyResource(params["resource"]),
		params["resource_id"],
		db.PolicyAction(params["action"]),
	)
	if err != nil {
		api.Logger.Error("Error checking permission", "error", err)
		return c.SendStatus(fiber.StatusForbidden)
	}

	// Return appropriate status code
	if allowed {
		return c.SendStatus(fiber.StatusOK)
	}
	return c.SendStatus(fiber.StatusForbidden)
}
