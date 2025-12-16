package services

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"
	"slices"
	"strconv"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

const (
	nilPolicyValue = "nil"
)

type PolicyFilters struct {
	Effect     string
	Resource   string
	ResourceID string
	Action     string
	Principal  string
	RoleID     string
	UserID     string
}

func (api *APIServices) GetPolicy(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	policySQID string,
) (*db.Policy, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get policy",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"policy",
			policySQID,
		)
		return nil, ErrAccessDenied
	}

	// Decode the policy ID from the sqid
	policyID, decodeErr := api.SQIDManager.Decode("policies", policySQID)
	if decodeErr != nil {
		api.Logger.ErrorContext(c, "Error decoding policy ID", "error", decodeErr)
		return nil, ErrNotFound
	}

	// Get the policy by ID
	var policy db.Policy
	if findErr := api.DB.First(&policy, policyID).Error; findErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving policy", "error", findErr)
		return nil, ErrNotFound
	}

	// Verify the policy belongs to the workspace
	if policy.WorkspaceID != workspace.ID {
		api.Logger.ErrorContext(c, "Policy does not belong to workspace")
		return nil, ErrNotFound
	}

	return &policy, nil
}

func (api *APIServices) GetPoliciesForWorkspace(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	filters PolicyFilters,
) ([]db.Policy, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get policies for workspace",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Build base query
	query := api.DB.Where("workspace_id = ?", workspace.ID)

	// Apply simple filters directly
	if filters.Effect != "" {
		query = query.Where("effect = ?", filters.Effect)
	}
	if filters.Resource != "" {
		query = query.Where("resource = ?", filters.Resource)
	}
	if filters.Action != "" {
		query = query.Where("action = ?", filters.Action)
	}
	if filters.Principal != "" {
		query = query.Where("principal = ?", filters.Principal)
	}

	// Handle complex filters that require decoding
	if filters.ResourceID != "" && filters.Resource != "" {
		resourceID, decodeResourceIDErr := lib.DecodePolicyResourceID(
			filters.ResourceID,
			db.PolicyResource(filters.Resource),
			api.SQIDManager,
		)
		if decodeResourceIDErr != nil {
			api.Logger.ErrorContext(c, "Error decoding resource ID", "error", decodeResourceIDErr)
			return nil, NewInternalErrorf("error decoding resource ID: %w", decodeResourceIDErr)
		}
		query = query.Where("resource_id = ?", resourceID)
	}

	// Handle role_id filter
	if filters.RoleID != "" {
		roleID, decodeRoleIDErr := api.SQIDManager.Decode("roles", filters.RoleID)
		if decodeRoleIDErr != nil {
			api.Logger.ErrorContext(c, "Error decoding role ID", "error", decodeRoleIDErr)
			return nil, NewInternalErrorf("error decoding role ID: %w", decodeRoleIDErr)
		}
		query = query.Where("role_id = ?", roleID)
	}

	// Handle user_id filter
	if filters.UserID != "" {
		userID, decodeUserIDErr := api.SQIDManager.Decode("users", filters.UserID)
		if decodeUserIDErr != nil {
			api.Logger.ErrorContext(c, "Error decoding user ID", "error", decodeUserIDErr)
			return nil, NewInternalErrorf("error decoding user ID: %w", decodeUserIDErr)
		}
		workspaceUser, findWorkspaceUserErr := api.DB.GetWorkspaceUser(workspace.ID, uint(userID))
		if findWorkspaceUserErr != nil {
			api.Logger.ErrorContext(c, "Error finding workspace user ID", "error", findWorkspaceUserErr)
			return nil, NewInternalErrorf("error finding workspace user: %w", findWorkspaceUserErr)
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
		api.Logger.ErrorContext(c, "Error fetching policies", "error", queryErr)
		return nil, NewInternalErrorf("error fetching policies: %w", queryErr)
	}

	// Filter policies based on user permissions
	filteredPolicies, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourcePolicy,
		db.PolicyActionRead,
		policies,
		func(p db.Policy) uint { return p.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering policies by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering policies by permissions: %w", err)
	}

	return filteredPolicies, nil
}

// validateAndCreatePolicy validates and creates a new policy.
func (api *APIServices) validateAndCreatePolicy(
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
func (api *APIServices) handleOptionalPolicyFields(
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
			return NewInternalErrorf("error decoding resource ID: %w", decodeResourceIDErr)
		}
		policy.ResourceID = resourceID
	}

	if fields["role_id"] != "" {
		if policy.Principal != db.PolicyPrincipalRole {
			return errors.New("invalid principal for role")
		}
		roleID, err := api.SQIDManager.Decode("roles", fields["role_id"])
		if err != nil {
			return NewInternalErrorf("error decoding role ID: %w", err)
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
			return NewInternalErrorf("error decoding user ID: %w", err)
		}
		workspaceUser, err := api.DB.GetWorkspaceUser(workspaceID, uint(userID))
		if err != nil {
			return NewInternalErrorf("error finding workspace user: %w", err)
		}
		policy.WorkspaceUserID = &workspaceUser.ID
	}

	return nil
}

// createPolicyInTransaction creates a policy within a transaction with advisory locking.
func (api *APIServices) createPolicyInTransaction(
	c context.Context,
	workspace *db.Workspace,
	newPolicy *db.Policy,
) error {
	return api.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock based on unique policy attributes
		// Format pointer values properly to avoid using memory addresses
		resourceIDStr := nilPolicyValue
		if newPolicy.ResourceID != nil {
			resourceIDStr = strconv.FormatUint(uint64(*newPolicy.ResourceID), 10)
		}
		roleIDStr := nilPolicyValue
		if newPolicy.RoleID != nil {
			roleIDStr = strconv.FormatUint(uint64(*newPolicy.RoleID), 10)
		}
		workspaceUserIDStr := nilPolicyValue
		if newPolicy.WorkspaceUserID != nil {
			workspaceUserIDStr = strconv.FormatUint(uint64(*newPolicy.WorkspaceUserID), 10)
		}

		lockKey := fmt.Sprintf(
			"policy:create:%d:%s:%s:%s:%s:%s:%s:%s",
			workspace.ID,
			newPolicy.Principal,
			newPolicy.Resource,
			newPolicy.Action,
			newPolicy.Effect,
			resourceIDStr,
			roleIDStr,
			workspaceUserIDStr,
		)
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			api.Logger.ErrorContext(c, "Error acquiring lock for policy creation", "error", lockErr)
			return NewInternalErrorf("error acquiring lock for policy creation: %w", lockErr)
		}

		// Check for existing policy after acquiring lock
		var existingPolicy db.Policy
		existingPolicyErr := tx.Where(
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
			api.Logger.ErrorContext(c, "Policy already exists")
			return ErrPolicyAlreadyExists
		}
		if !errors.Is(existingPolicyErr, gorm.ErrRecordNotFound) {
			api.Logger.ErrorContext(c, "Error checking for existing policy", "error", existingPolicyErr)
			return NewInternalErrorf("error checking for existing policy: %w", existingPolicyErr)
		}

		// Create the policy
		if createPolicyErr := tx.Create(newPolicy).Error; createPolicyErr != nil {
			api.Logger.ErrorContext(c, "Error creating policy", "error", createPolicyErr)
			return NewInternalErrorf("error creating policy: %w", createPolicyErr)
		}

		return nil
	})
}

func (api *APIServices) CreatePolicy(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreatePolicyRequest,
) (*db.Policy, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create policy",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Convert to fields map for compatibility with existing helper functions
	fields := map[string]string{
		"effect":      string(req.Effect),
		"action":      string(req.Action),
		"resource":    string(req.Resource),
		"principal":   string(req.Principal),
		"resource_id": "",
		"role_id":     "",
		"user_id":     "",
	}

	// Safely handle optional fields
	if req.ResourceID != nil {
		fields["resource_id"] = *req.ResourceID
	}
	if req.RoleID != nil {
		fields["role_id"] = *req.RoleID
	}
	if req.UserID != nil {
		fields["user_id"] = *req.UserID
	}

	// Validate and create policy
	newPolicy, validateAndCreatePolicyErr := api.validateAndCreatePolicy(workspace, fields)
	if validateAndCreatePolicyErr != nil {
		api.Logger.ErrorContext(c, "Invalid policy combination", "error", validateAndCreatePolicyErr)
		return nil, validateAndCreatePolicyErr
	}

	// Handle optional fields
	if handleOptionalPolicyFieldsErr := api.handleOptionalPolicyFields(workspace.ID, newPolicy, fields); handleOptionalPolicyFieldsErr != nil {
		api.Logger.ErrorContext(c, "Error handling optional fields", "error", handleOptionalPolicyFieldsErr)
		return nil, handleOptionalPolicyFieldsErr
	}

	// Create policy in transaction with advisory lock
	if transactionErr := api.createPolicyInTransaction(c, workspace, newPolicy); transactionErr != nil {
		return nil, transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeCreate,
		Description: fmt.Sprintf(
			"Policy created for resource %s, action %s, principal %s, effect %s",
			newPolicy.Resource,
			newPolicy.Action,
			newPolicy.Principal,
			newPolicy.Effect,
		),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		PolicyID:    &newPolicy.ID,
	})

	return newPolicy, nil
}

func (api *APIServices) UpdatePolicy(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	policy *db.Policy,
	req irmincore.UpdatePolicyRequest,
) (*db.Policy, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update policy",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Convert to fields map for compatibility with existing helper functions
	fields := map[string]string{
		"effect":      "",
		"action":      "",
		"resource":    "",
		"principal":   "",
		"resource_id": "",
		"role_id":     "",
		"user_id":     "",
	}

	// Only include fields that were actually provided in the request
	if req.Effect != "" {
		fields["effect"] = string(req.Effect)
	}
	if req.Action != "" {
		fields["action"] = string(req.Action)
	}
	if req.Resource != "" {
		fields["resource"] = string(req.Resource)
	}
	if req.Principal != "" {
		fields["principal"] = string(req.Principal)
	}

	// Safely handle optional pointer fields
	if req.ResourceID != nil {
		fields["resource_id"] = *req.ResourceID
	}
	if req.RoleID != nil {
		fields["role_id"] = *req.RoleID
	}
	if req.UserID != nil {
		fields["user_id"] = *req.UserID
	}

	// Update required fields only if they were provided
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
		api.Logger.ErrorContext(c, "Error handling optional fields", "error", handleOptionalPolicyFieldsErr)
		return nil, handleOptionalPolicyFieldsErr
	}

	// Update the policy
	if updateErr := api.DB.Save(&policy).Error; updateErr != nil {
		api.Logger.ErrorContext(c, "Error updating policy", "error", updateErr)
		return nil, updateErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Policy updated for resource %s, action %s, principal %s, effect %s",
			policy.Resource,
			policy.Action,
			policy.Principal,
			policy.Effect,
		),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		PolicyID:    &policy.ID,
	})

	return policy, nil
}

func (api *APIServices) DeletePolicy(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	policy *db.Policy,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete policy",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return ErrAccessDenied
	}

	// Delete the policy
	if deleteErr := api.DB.Delete(&policy).Error; deleteErr != nil {
		api.Logger.ErrorContext(c, "Error deleting policy", "error", deleteErr)
		return deleteErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeDelete,
		Description: fmt.Sprintf(
			"Policy deleted for resource %s, action %s, principal %s, effect %s",
			policy.Resource,
			policy.Action,
			policy.Principal,
			policy.Effect,
		),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		PolicyID:    &policy.ID,
	})

	return nil
}

func (api *APIServices) GetPolicyResourceOptions(c context.Context, workspace *db.Workspace) (
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
		return api.DB.GetStoredQueriesByWorkspaceID(workspace.ID)
	}
	getWorkflows := func() ([]db.Workflow, error) {
		return api.DB.GetWorkflowsByWorkspaceID(workspace.ID)
	}
	getConnections := func() ([]db.Connection, error) {
		return api.DB.GetConnectionsByWorkspaceID(workspace.ID)
	}
	getRepositories := func() ([]db.Repository, error) {
		return api.DB.GetRepositoriesInWorkspace(workspace.ID)
	}
	getTags := func() ([]db.Tag, error) {
		return api.DB.GetTagsByWorkspace(workspace.ID)
	}
	getUsers := func() ([]db.WorkspaceUser, error) {
		return api.DB.GetUsersInWorkspace(workspace.ID)
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
		api.Logger.ErrorContext(c, "Error fetching queries", "error", queriesErr)
		return nil, nil, nil, nil, nil, nil, queriesErr
	}

	workflows, workflowsErr := workflowsFuture.Await()
	if workflowsErr != nil {
		api.Logger.ErrorContext(c, "Error fetching workflows", "error", workflowsErr)
		return nil, nil, nil, nil, nil, nil, workflowsErr
	}

	connections, connectionsErr := connectionsFuture.Await()
	if connectionsErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connections", "error", connectionsErr)
		return nil, nil, nil, nil, nil, nil, connectionsErr
	}

	repositories, repositoriesErr := repositoriesFuture.Await()
	if repositoriesErr != nil {
		api.Logger.ErrorContext(c, "Error fetching repositories", "error", repositoriesErr)
		return nil, nil, nil, nil, nil, nil, repositoriesErr
	}

	tags, tagsErr := tagsFuture.Await()
	if tagsErr != nil {
		api.Logger.ErrorContext(c, "Error fetching tags", "error", tagsErr)
		return nil, nil, nil, nil, nil, nil, tagsErr
	}

	users, usersErr := usersFuture.Await()
	if usersErr != nil {
		api.Logger.ErrorContext(c, "Error fetching users", "error", usersErr)
		return nil, nil, nil, nil, nil, nil, usersErr
	}

	// TODO: We should filter the options based on the user's permissions

	return queries, workflows, connections, repositories, tags, users, nil
}

// getApplicablePoliciesForRole returns all applicable policies for a given role.
func (api *APIServices) getApplicablePoliciesForRole(workspace *db.Workspace, role *db.Role) ([]db.Policy, error) {
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

// categorizePolicies categorizes policies into user-specific, role, and everyone policies.
func (api *APIServices) categorizePolicies(
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
func (api *APIServices) combinePolicies(userSpecific, role, everyone []db.Policy) []db.Policy {
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
func (api *APIServices) policiesConflict(policy1, policy2 db.Policy) bool {
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
func (api *APIServices) getUserApplicablePolicies(
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
			db.PolicyResourceScript,
			db.PolicyResourceQuery,
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
func (api *APIServices) deduplicatePolicies(policies []db.Policy) []db.Policy {
	// Create a map to track policies by their unique key (resource, resourceID, action)
	policyMap := make(map[string]*db.Policy)

	for i := range policies {
		policy := &policies[i]

		// Create a unique key for this policy combination
		resourceIDStr := nilPolicyValue
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

func (api *APIServices) GetPoliciesRoleSummary(
	c context.Context,
	workspace *db.Workspace,
) ([]irminmodels.RolePolicySummary, error) {
	// Fetch all roles
	roles, err := api.DB.GetRoles()
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching roles", "error", err)
		return nil, err
	}

	// Create a map of role ID to its applicable policies
	rolePolicies := make([]irminmodels.RolePolicySummary, 0, len(roles))

	// For each role, collect its applicable policies
	for _, role := range roles {
		policies, getApplicablePoliciesErr := api.getApplicablePoliciesForRole(workspace, &role)
		if getApplicablePoliciesErr != nil {
			api.Logger.ErrorContext(c, "Error getting applicable policies for role", "error", getApplicablePoliciesErr)
			continue
		}

		formattedPolicies, formatPoliciesErr := formatter.FormatIndexResponse(
			policies,
			formatter.FormatPolicyResponse,
			api.SQIDManager,
		)
		if formatPoliciesErr != nil {
			api.Logger.ErrorContext(c, "Error formatting policies", "error", formatPoliciesErr)
			continue
		}

		formattedRole, formatRoleErr := formatter.FormatRoleResponse(&role, api.SQIDManager)
		if formatRoleErr != nil {
			api.Logger.ErrorContext(c, "Error formatting role", "error", formatRoleErr)
			continue
		}

		rolePolicies = append(rolePolicies, irminmodels.RolePolicySummary{
			Role:     *formattedRole,
			IsOwner:  role.IsOwner,
			Policies: formattedPolicies,
		})
	}

	return rolePolicies, nil
}

func (api *APIServices) GetPoliciesForUser(
	c context.Context,
	workspace *db.Workspace,
	user *db.User,
) ([]db.Policy, *db.WorkspaceUser, bool, error) {
	// Get the workspace user record
	workspaceUser, err := api.DB.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching workspace user", "error", err)
		return nil, nil, false, err
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
		api.Logger.ErrorContext(c, "Error getting applicable policies", "error", err)
		return nil, nil, isOwner, err
	}

	return policies, workspaceUser, isOwner, nil
}

func (api *APIServices) CheckPolicyPermission(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	resource db.PolicyResource,
	resourceID string,
	action db.PolicyAction,
) (bool, error) {
	// Convert resource_id if provided
	var resourceIDUint *uint
	if resourceID != "" {
		var decodeResourceIDErr error
		resourceIDUint, decodeResourceIDErr = lib.DecodePolicyResourceID(
			resourceID,
			resource,
			api.SQIDManager,
		)
		if decodeResourceIDErr != nil {
			// If decoding fails, we can log it, but we can still check permission
			// because the resource_id is optional, and not available for certain resources
			api.Logger.ErrorContext(c, "Error decoding resource ID", "error", decodeResourceIDErr)
		}
	}

	// Check permission
	allowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		resource,
		resourceIDUint,
		action,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking permission", "error", err)
		return false, err
	}

	return allowed, nil
}
