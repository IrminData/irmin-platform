package controllers

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"strconv"

	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// PoliciesIndex returns a list of all policies for a workspace.
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

	// Build base query
	query := api.DB.Where("workspace_id = ?", workspace.ID)

	// Apply simple filters directly
	for _, field := range []string{"effect", "resource", "action", "principal"} {
		if value := filters[field]; value != "" {
			query = query.Where(field+" = ?", value)
		}
	}

	// Handle complex filters that require decoding
	if filters["resource_id"] != "" && filters["resource"] != "" {
		resourceID, decodeResourceIDErr := lib.DecodePolicyResourceID(
			filters["resource_id"],
			db.PolicyResource(filters["resource"]),
			api.SQIDManager,
		)
		if decodeResourceIDErr != nil {
			api.Logger.Error("Error decoding resource ID", "error", decodeResourceIDErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_request")},
			})
		}
		query = query.Where("resource_id = ?", resourceID)
	}

	// Handle role_id filter
	if filters["role_id"] != "" {
		roleID, decodeRoleIDErr := api.SQIDManager.Decode("roles", filters["role_id"])
		if decodeRoleIDErr != nil {
			api.Logger.Error("Error decoding role ID", "error", decodeRoleIDErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_request")},
			})
		}
		query = query.Where("role_id = ?", roleID)
	}

	// Handle user_id filter
	if filters["user_id"] != "" {
		userID, decodeUserIDErr := api.SQIDManager.Decode("users", filters["user_id"])
		if decodeUserIDErr != nil {
			api.Logger.Error("Error decoding user ID", "error", decodeUserIDErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_request")},
			})
		}
		workspaceUser, findWorkspaceUserErr := api.DB.GetWorkspaceUser(workspace.ID, uint(userID))
		if findWorkspaceUserErr != nil {
			api.Logger.Error("Error finding workspace user ID", "error", findWorkspaceUserErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_request")},
			})
		}
		query = query.Where("workspace_user_id = ?", workspaceUser.ID)
	}

	// Fetch policies
	var policies []db.Policy
	if queryErr := query.
		Preload("Role").
		Preload("WorkspaceUser").
		Preload("WorkspaceUser.User").
		Find(&policies).Error; queryErr != nil {
		api.Logger.Error("Error fetching policies", "error", queryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter policies based on user permissions
	filteredPolicies, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourcePolicy,
		db.PolicyActionRead,
		policies,
		func(p db.Policy) uint { return p.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering policies by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	policiesResponse, formatErr := formatter.FormatIndexResponse(
		filteredPolicies,
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: policiesResponse,
	})
}

// validateAndCreatePolicy validates and creates a new policy.
func (api *APIControllers) validateAndCreatePolicy(
	workspace *db.Workspace,
	fields map[string]string,
) (*db.Policy, error) {
	principal := db.PolicyPrincipal(fields["principal"])
	resource := db.PolicyResource(fields["resource"])
	action := db.PolicyAction(fields["action"])

	// Generate all possible policies for this resource/action combination
	possiblePolicies := api.DB.GenerateAllPossiblePolicies(
		workspace.ID,
		principal,
		nil, // We'll set the ID after validation
		db.PolicyGenerationOptions{
			IncludeResources: []db.PolicyResource{resource},
			IncludeActions:   []db.PolicyAction{action},
			Effect:           db.PolicyEffect(fields["effect"]),
		},
	)

	if len(possiblePolicies) == 0 {
		return nil, fmt.Errorf(
			"invalid policy combination: resource=%s, action=%s, principal=%s",
			resource,
			action,
			principal,
		)
	}

	// Use the first generated policy as our template
	return &possiblePolicies[0], nil
}

// handleOptionalPolicyFields processes optional fields for a policy.
func (api *APIControllers) handleOptionalPolicyFields(
	workspaceID uint,
	policy *db.Policy,
	fields map[string]string,
) error {
	if fields["resource_id"] != "" {
		resourceID, decodeResourceIDErr := lib.DecodePolicyResourceID(
			fields["resource_id"],
			policy.Resource,
			api.SQIDManager,
		)
		if decodeResourceIDErr != nil {
			return fmt.Errorf("error decoding resource ID: %w", decodeResourceIDErr)
		}
		policy.ResourceID = resourceID
	}

	if fields["role_id"] != "" {
		if policy.Principal != db.PolicyPrincipalRole {
			return errors.New("invalid principal for role")
		}
		roleID, err := api.SQIDManager.Decode("roles", fields["role_id"])
		if err != nil {
			return fmt.Errorf("error decoding role ID: %w", err)
		}
		rid := uint(roleID)
		policy.RoleID = &rid
	}

	if fields["user_id"] != "" {
		if policy.Principal != db.PolicyPrincipalWorkspaceUser {
			return errors.New("invalid principal for user")
		}
		userID, err := api.SQIDManager.Decode("users", fields["user_id"])
		if err != nil {
			return fmt.Errorf("error decoding user ID: %w", err)
		}
		workspaceUser, err := api.DB.GetWorkspaceUser(workspaceID, uint(userID))
		if err != nil {
			return fmt.Errorf("error finding workspace user ID: %w", err)
		}
		policy.WorkspaceUserID = &workspaceUser.ID
	}

	return nil
}

// PoliciesStore creates a new policy for a workspace.
func (api *APIControllers) PoliciesStore(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate request fields
	fields, parseFormFieldsErr := utils.ParseFormFields(
		c,
		[]string{"effect", "action", "resource", "principal"},
		[]string{"resource_id", "role_id", "user_id"},
	)
	if parseFormFieldsErr != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate and create policy
	newPolicy, validateAndCreatePolicyErr := api.validateAndCreatePolicy(workspace, fields)
	if validateAndCreatePolicyErr != nil {
		api.Logger.Error("Invalid policy combination", "error", validateAndCreatePolicyErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_policy_combination")},
		})
	}

	// Handle optional fields
	if handleOptionalPolicyFieldsErr := api.handleOptionalPolicyFields(workspace.ID, newPolicy, fields); handleOptionalPolicyFieldsErr != nil {
		api.Logger.Error("Error handling optional fields", "error", handleOptionalPolicyFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Check for existing policy
	var existingPolicy db.Policy
	existingPolicyErr := api.DB.Where(
		"workspace_id = ? AND principal = ? AND resource = ? AND action = ? AND effect = ? AND COALESCE(resource_id, 0) = COALESCE(?, 0) AND COALESCE(role_id, 0) = COALESCE(?, 0) AND COALESCE(workspace_user_id, 0) = COALESCE(?, 0)",
		workspace.ID,
		newPolicy.Principal,
		newPolicy.Resource,
		newPolicy.Action,
		newPolicy.Effect,
		newPolicy.ResourceID,
		newPolicy.RoleID,
		newPolicy.WorkspaceUserID,
	).First(&existingPolicy).Error

	if existingPolicyErr == nil {
		return utils.WriteResponse(c, fiber.StatusConflict, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "policy_already_exists")},
		})
	} else if !errors.Is(existingPolicyErr, gorm.ErrRecordNotFound) {
		api.Logger.Error("Error checking for existing policy", "error", existingPolicyErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the policy
	if createPolicyErr := api.DB.Create(newPolicy).Error; createPolicyErr != nil {
		api.Logger.Error("Error creating policy", "error", createPolicyErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	policyResponse, formatPolicyErr := formatter.FormatPolicyResponse(newPolicy, api.SQIDManager)
	if formatPolicyErr != nil {
		api.Logger.Error("Error formatting policy response", "error", formatPolicyErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Policy created for resource %s", newPolicy.Resource),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		PolicyID:    &newPolicy.ID,
	})

	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_created"),
		Data:    policyResponse,
	})
}

// PoliciesShow returns a single policy.
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: policyResponse,
	})
}

// PoliciesUpdate updates an existing policy.
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

	// Parse and validate request fields
	fields, err := utils.ParseFormFields(
		c,
		nil,
		[]string{"effect", "action", "resource", "principal", "resource_id", "role_id", "user_id"},
	)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update required fields
	if fields["effect"] != "" {
		policy.Effect = db.PolicyEffect(fields["effect"])
	}
	if fields["action"] != "" {
		policy.Action = db.PolicyAction(fields["action"])
	}
	if fields["resource"] != "" {
		policy.Resource = db.PolicyResource(fields["resource"])
	}
	if fields["principal"] != "" {
		policy.Principal = db.PolicyPrincipal(fields["principal"])
	}

	// Handle optional fields
	if handleOptionalPolicyFieldsErr := api.handleOptionalPolicyFields(workspace.ID, policy, fields); handleOptionalPolicyFieldsErr != nil {
		api.Logger.Error("Error handling optional fields", "error", handleOptionalPolicyFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update the policy
	if updateErr := api.DB.Save(&policy).Error; updateErr != nil {
		api.Logger.Error("Error updating policy", "error", updateErr)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Policy updated for resource %s", policy.Resource),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		PolicyID:    &policy.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_updated"),
		Data:    policyResponse,
	})
}

// PoliciesDestroy deletes a policy.
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
	err = api.DB.Delete(policy).Error
	if err != nil {
		api.Logger.Error("Error deleting policy", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Policy deleted for resource %s", policy.Resource),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		PolicyID:    &policy.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_deleted"),
	})
}

// fetchPolicyResourceData fetches all the data needed for policy resource options.
func (api *APIControllers) fetchPolicyResourceData(workspaceID uint) (
	[]db.StoredQuery,
	[]db.Workflow,
	[]db.Connection,
	[]db.Repository,
	[]db.Tag,
	[]db.WorkspaceUser,
	error,
) {
	// Create async functions for each database call
	getQueries := func() ([]db.StoredQuery, error) {
		return api.DB.GetStoredQueriesByWorkspaceID(workspaceID)
	}
	getWorkflows := func() ([]db.Workflow, error) {
		return api.DB.GetWorkflowsByWorkspaceID(workspaceID)
	}
	getConnections := func() ([]db.Connection, error) {
		return api.DB.GetConnectionsByWorkspaceID(workspaceID)
	}
	getRepositories := func() ([]db.Repository, error) {
		return api.DB.GetRepositoriesInWorkspace(workspaceID)
	}
	getTags := func() ([]db.Tag, error) {
		return api.DB.GetTagsByWorkspace(workspaceID)
	}
	getUsers := func() ([]db.WorkspaceUser, error) {
		return api.DB.GetUsersInWorkspace(workspaceID)
	}

	// Run all database calls concurrently
	queriesFuture := utils.Async(getQueries)
	workflowsFuture := utils.Async(getWorkflows)
	connectionsFuture := utils.Async(getConnections)
	repositoriesFuture := utils.Async(getRepositories)
	tagsFuture := utils.Async(getTags)
	usersFuture := utils.Async(getUsers)

	// Collect results
	queries, queriesErr := queriesFuture.Await()
	if queriesErr != nil {
		return nil, nil, nil, nil, nil, nil, queriesErr
	}

	workflows, workflowsErr := workflowsFuture.Await()
	if workflowsErr != nil {
		return nil, nil, nil, nil, nil, nil, workflowsErr
	}

	connections, connectionsErr := connectionsFuture.Await()
	if connectionsErr != nil {
		return nil, nil, nil, nil, nil, nil, connectionsErr
	}

	repositories, repositoriesErr := repositoriesFuture.Await()
	if repositoriesErr != nil {
		return nil, nil, nil, nil, nil, nil, repositoriesErr
	}

	tags, tagsErr := tagsFuture.Await()
	if tagsErr != nil {
		return nil, nil, nil, nil, nil, nil, tagsErr
	}

	users, usersErr := usersFuture.Await()
	if usersErr != nil {
		return nil, nil, nil, nil, nil, nil, usersErr
	}

	return queries, workflows, connections, repositories, tags, users, nil
}

// PoliciesResourceOptions returns all possible policy resource options for a given workspace.
func (api *APIControllers) PoliciesResourceOptions(c fiber.Ctx) error {
	_, dict, _, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Fetch all resource data
	queries, workflows, connections, repositories, tags, users, err := api.fetchPolicyResourceData(workspace.ID)
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: policyResourceOptions,
	})
}

// getApplicablePoliciesForRole returns all applicable policies for a given role.
func (api *APIControllers) getApplicablePoliciesForRole(workspace *db.Workspace, role *db.Role) ([]db.Policy, error) {
	if role.IsOwner {
		return api.DB.GenerateAllPossiblePolicies(workspace.ID, db.PolicyPrincipalRole, &role.ID), nil
	}

	// For non-owner roles, fetch actual policies
	var policies []db.Policy
	err := api.DB.Where("workspace_id = ?", workspace.ID).
		Preload("Role").
		Preload("WorkspaceUser").
		Preload("WorkspaceUser.User").
		Find(&policies).
		Error
	if err != nil {
		return nil, err
	}

	// Get role-specific policies
	var roleSpecificPolicies []db.Policy
	var everyonePolicies []db.Policy
	for _, policy := range policies {
		if policy.RoleID != nil && *policy.RoleID == role.ID {
			roleSpecificPolicies = append(roleSpecificPolicies, policy)
		} else if policy.Principal == db.PolicyPrincipalEveryone {
			everyonePolicies = append(everyonePolicies, policy)
		}
	}

	// Start with role-specific policies
	applicablePolicies := append([]db.Policy{}, roleSpecificPolicies...)

	// Add everyone policies that don't conflict with role-specific policies
	for _, everyonePolicy := range everyonePolicies {
		conflicts := false
		for _, rolePolicy := range roleSpecificPolicies {
			if api.policiesConflict(rolePolicy, everyonePolicy) {
				conflicts = true
				break
			}
		}
		if !conflicts {
			applicablePolicies = append(applicablePolicies, everyonePolicy)
		}
	}

	// Deduplicate policies to ensure only one policy per resource/resourceID/action combination
	// with deny policies taking priority over allow policies
	deduplicatedPolicies := api.deduplicatePolicies(applicablePolicies)

	return deduplicatedPolicies, nil
}

// PoliciesRoleSummary returns a list of policies that apply to each role.
func (api *APIControllers) PoliciesRoleSummary(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		api.Logger.Error("Error validating local parameters in PoliciesRoleSummary")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Fetch all roles
	roles, err := api.DB.GetRoles()
	if err != nil {
		api.Logger.Error("Error fetching roles", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create a map of role ID to its applicable policies
	rolePolicies := make([]irminmodels.RolePolicySummary, 0, len(roles))

	// For each role, collect its applicable policies
	for _, role := range roles {
		policies, getApplicablePoliciesErr := api.getApplicablePoliciesForRole(workspace, &role)
		if getApplicablePoliciesErr != nil {
			api.Logger.Error("Error getting applicable policies for role", "error", getApplicablePoliciesErr)
			continue
		}

		formattedPolicies, formatPoliciesErr := formatter.FormatIndexResponse(
			policies,
			formatter.FormatPolicyResponse,
			api.SQIDManager,
		)
		if formatPoliciesErr != nil {
			api.Logger.Error("Error formatting policies", "error", formatPoliciesErr)
			continue
		}

		formattedRole, formatRoleErr := formatter.FormatRoleResponse(&role, api.SQIDManager)
		if formatRoleErr != nil {
			api.Logger.Error("Error formatting role", "error", formatRoleErr)
			continue
		}

		rolePolicies = append(rolePolicies, irminmodels.RolePolicySummary{
			Role:     *formattedRole,
			IsOwner:  role.IsOwner,
			Policies: formattedPolicies,
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: rolePolicies,
	})
}

// categorizePolicies categorizes policies into user-specific, role, and everyone policies.
func (api *APIControllers) categorizePolicies(
	policies []db.Policy,
	workspaceUser *db.WorkspaceUser,
) ([]db.Policy, []db.Policy, []db.Policy) {
	var userSpecificPolicies []db.Policy
	var rolePolicies []db.Policy
	var everyonePolicies []db.Policy

	for _, policy := range policies {
		switch {
		case policy.Principal == db.PolicyPrincipalWorkspaceUser && policy.WorkspaceUserID != nil && *policy.WorkspaceUserID == workspaceUser.ID:
			userSpecificPolicies = append(userSpecificPolicies, policy)
		case policy.Principal == db.PolicyPrincipalEveryone:
			everyonePolicies = append(everyonePolicies, policy)
		}
	}

	// Get role policies
	for _, userRole := range workspaceUser.Roles {
		for _, policy := range policies {
			if policy.RoleID != nil && *policy.RoleID == userRole.RoleID {
				rolePolicies = append(rolePolicies, policy)
			}
		}
	}

	return userSpecificPolicies, rolePolicies, everyonePolicies
}

// combinePolicies combines policies in order of precedence.
func (api *APIControllers) combinePolicies(userSpecific, role, everyone []db.Policy) []db.Policy {
	applicablePolicies := slices.Clone(userSpecific)

	// Add role policies that aren't overridden by user-specific policies
	for _, rolePolicy := range role {
		overridden := false
		for _, userPolicy := range userSpecific {
			if api.policiesConflict(userPolicy, rolePolicy) {
				overridden = true
				break
			}
		}
		if !overridden {
			applicablePolicies = append(applicablePolicies, rolePolicy)
		}
	}

	// Add everyone policies that aren't overridden
	for _, everyonePolicy := range everyone {
		overridden := false
		for _, policy := range applicablePolicies {
			if api.policiesConflict(policy, everyonePolicy) {
				overridden = true
				break
			}
		}
		if !overridden {
			applicablePolicies = append(applicablePolicies, everyonePolicy)
		}
	}

	return applicablePolicies
}

// policiesConflict checks if two policies conflict (same resource, resourceID, and action).
func (api *APIControllers) policiesConflict(policy1, policy2 db.Policy) bool {
	// Check if resource and action match
	if policy1.Resource != policy2.Resource || policy1.Action != policy2.Action {
		return false
	}

	// Check if ResourceID matches (both nil, or both non-nil with same value)
	if policy1.ResourceID == nil && policy2.ResourceID == nil {
		return true
	}
	if policy1.ResourceID != nil && policy2.ResourceID != nil && *policy1.ResourceID == *policy2.ResourceID {
		return true
	}

	return false
}

// getUserApplicablePolicies returns all applicable policies for a given user.
func (api *APIControllers) getUserApplicablePolicies(
	workspace *db.Workspace,
	workspaceUser *db.WorkspaceUser,
	isOwner bool,
) ([]db.Policy, error) {
	// Fetch all policies for the workspace
	var policies []db.Policy
	if err := api.DB.Where("workspace_id = ?", workspace.ID).Preload("Role").Preload("WorkspaceUser").Preload("WorkspaceUser.User").Find(&policies).Error; err != nil {
		return nil, err
	}

	// Categorize policies
	userSpecific, role, everyone := api.categorizePolicies(policies, workspaceUser)

	// Combine policies in order of precedence
	applicablePolicies := api.combinePolicies(userSpecific, role, everyone)

	// If user is an owner, ensure they have all permissions through their role
	if isOwner {
		// Get the owner role
		ownerRole, err := api.DB.GetOwnerRole()
		if err != nil {
			return nil, fmt.Errorf("error getting owner role: %w", err)
		}

		// Create a map of existing resource/action combinations
		existingCombos := make(map[string]bool)
		for _, policy := range applicablePolicies {
			key := fmt.Sprintf("%s:%s", policy.Resource, policy.Action)
			existingCombos[key] = true
		}

		// Add any missing resource/action combinations with allow effect through the owner role
		for _, resource := range []db.PolicyResource{
			db.PolicyResourceWorkspace,
			db.PolicyResourceEditorScript,
			db.PolicyResourceWorkflow,
			db.PolicyResourceConnection,
			db.PolicyResourceRepository,
			db.PolicyResourceRepositoryObject,
			db.PolicyResourceWorkspaceTag,
			db.PolicyResourceUser,
			db.PolicyResourcePolicy,
			db.PolicyResourceInvite,
			db.PolicyResourceAuditLog,
			db.PolicyResourceDocumentation,
			db.PolicyResourceBilling,
		} {
			for _, action := range []db.PolicyAction{
				db.PolicyActionCreate,
				db.PolicyActionRead,
				db.PolicyActionUpdate,
				db.PolicyActionDelete,
			} {
				key := fmt.Sprintf("%s:%s", resource, action)
				if !existingCombos[key] {
					applicablePolicies = append(applicablePolicies, db.Policy{
						Effect:      db.PolicyEffectAllow,
						Action:      action,
						Resource:    resource,
						Principal:   db.PolicyPrincipalRole,
						WorkspaceID: workspace.ID,
						RoleID:      &ownerRole.ID,
					})
				}
			}
		}
	}

	// Deduplicate policies to ensure only one policy per resource/resourceID/action combination
	// with deny policies taking priority over allow policies
	deduplicatedPolicies := api.deduplicatePolicies(applicablePolicies)

	return deduplicatedPolicies, nil
}

// deduplicatePolicies removes duplicate policies for the same resource/resourceID/action combination,
// prioritizing deny policies over allow policies.
func (api *APIControllers) deduplicatePolicies(policies []db.Policy) []db.Policy {
	// Create a map to track policies by their unique key (resource, resourceID, action)
	policyMap := make(map[string]*db.Policy)

	for i := range policies {
		policy := &policies[i]

		// Create a unique key for this policy combination
		resourceIDStr := "nil"
		if policy.ResourceID != nil {
			resourceIDStr = strconv.FormatUint(uint64(*policy.ResourceID), 10)
		}
		key := fmt.Sprintf("%s:%s:%s", policy.Resource, resourceIDStr, policy.Action)

		_, exists := policyMap[key]
		if !exists {
			// No existing policy for this combination, add it
			policyMap[key] = policy
		} else if policy.Effect == db.PolicyEffectDeny {
			// Policy already exists for this combination
			// Prioritize deny policies over allow policies
			policyMap[key] = policy
		}
	}

	// Convert map back to slice
	result := make([]db.Policy, 0, len(policyMap))
	for _, policy := range policyMap {
		result = append(result, *policy)
	}

	return result
}

// PoliciesMySummary returns a list of policies that apply to the current user.
func (api *APIControllers) PoliciesMySummary(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		api.Logger.Error("Error validating local parameters in PoliciesMySummary")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workspace user record
	workspaceUser, err := api.DB.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		api.Logger.Error("Error fetching workspace user", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Check if user is workspace owner
	isOwner := workspace.OwnerID == user.ID
	if !isOwner {
		// Check if any of the user's roles have IsOwner=true
		for _, userRole := range workspaceUser.Roles {
			if userRole.Role.IsOwner {
				isOwner = true
				break
			}
		}
	}

	// Get applicable policies
	policies, err := api.getUserApplicablePolicies(workspace, workspaceUser, isOwner)
	if err != nil {
		api.Logger.Error("Error getting applicable policies", "error", err)
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: summary,
	})
}

// CheckPermission checks if the current user can perform a specific action on a resource.
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

	// Convert resource_id if provided
	var resourceID uint
	if params["resource_id"] != "" {
		var decodeResourceIDErr error
		resourceIDPtr, decodeResourceIDErr := lib.DecodePolicyResourceID(
			params["resource_id"],
			db.PolicyResource(params["resource"]),
			api.SQIDManager,
		)
		if resourceIDPtr != nil {
			resourceID = *resourceIDPtr
		}
		if decodeResourceIDErr != nil {
			// If decoding fails, we can log it, but we can still check permission
			// because the resource_id is optional, and not available for certain resources
			api.Logger.Error("Error decoding resource ID", "error", decodeResourceIDErr)
		}
	}

	// Check permission
	allowed, err := api.permissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResource(params["resource"]),
		&resourceID,
		db.PolicyAction(params["action"]),
	)
	if err != nil {
		api.Logger.Error("Error checking permission", "error", err)
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	// Return appropriate status code
	if allowed {
		return c.SendStatus(fiber.StatusOK)
	}
	return c.SendStatus(fiber.StatusForbidden)
}
