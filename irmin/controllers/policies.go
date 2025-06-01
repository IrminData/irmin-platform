package controllers

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// PoliciesIndex returns a list of all policies for a workspace.
func (api *APIControllers) PoliciesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		api.Logger.Error("Error validating local parameters in PoliciesIndex")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check permissions
	allowed, err := lib.IsAllowed(
		api.DB,
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionRead,
	)
	if err != nil || !allowed {
		api.Logger.Error("Access denied to perform action", "error", err)
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Fetch policies for the workspace
	var policies []db.Policy
	err = api.DB.Where("workspace_id = ?", workspace.ID).Find(&policies).Error
	if err != nil {
		api.Logger.Error("Error fetching policies", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	policiesResponse, err := formatter.FormatIndexResponse(policies, formatter.FormatPolicyResponse, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting policies response", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response
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
func (api *APIControllers) handleOptionalPolicyFields(policy *db.Policy, fields map[string]string) error {
	if fields["resource_id"] != "" {
		resourceID, decodeResourceIDErr := lib.DecodeSqidBasedOnResourceType(
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

	if fields["workspace_user_id"] != "" {
		if policy.Principal != db.PolicyPrincipalWorkspaceUser {
			return errors.New("invalid principal for user")
		}
		userID, err := api.SQIDManager.Decode("users", fields["workspace_user_id"])
		if err != nil {
			return fmt.Errorf("error decoding user ID: %w", err)
		}
		uid := uint(userID)
		policy.WorkspaceUserID = &uid
	}

	return nil
}

// PoliciesStore creates a new policy for a workspace.
func (api *APIControllers) PoliciesStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		api.Logger.Error("Error validating local parameters in PoliciesStore")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check permissions
	allowed, isAllowedErr := lib.IsAllowed(
		api.DB,
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionCreate,
	)
	if isAllowedErr != nil || !allowed {
		api.Logger.Error("Access denied to perform action", "error", isAllowedErr)
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Parse and validate request fields
	fields, parseFormFieldsErr := utils.ParseFormFields(
		c,
		[]string{"effect", "action", "resource", "principal"},
		[]string{"resource_id", "role_id", "workspace_user_id"},
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
	if handleOptionalPolicyFieldsErr := api.handleOptionalPolicyFields(newPolicy, fields); handleOptionalPolicyFieldsErr != nil {
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
	})

	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_created"),
		Data:    policyResponse,
	})
}

// PoliciesShow returns a single policy.
func (api *APIControllers) PoliciesShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	policy, policyOk := c.Locals("policy").(*db.Policy)

	if !dictOk || !workspaceOk || !userOk || !policyOk {
		api.Logger.Error("Error validating local parameters in PoliciesShow")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check permissions
	allowed, isAllowedErr := lib.IsAllowed(
		api.DB,
		user,
		workspace,
		db.PolicyResourcePolicy,
		&policy.ID,
		db.PolicyActionRead,
	)
	if isAllowedErr != nil || !allowed {
		api.Logger.Error("Access denied to perform action", "error", isAllowedErr)
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: policyResponse,
	})
}

// PoliciesUpdate updates an existing policy.
func (api *APIControllers) PoliciesUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	policy, policyOk := c.Locals("policy").(*db.Policy)

	if !dictOk || !workspaceOk || !userOk || !policyOk {
		api.Logger.Error("Error validating local parameters in PoliciesUpdate")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check permissions
	allowed, isAllowedErr := lib.IsAllowed(
		api.DB,
		user,
		workspace,
		db.PolicyResourcePolicy,
		&policy.ID,
		db.PolicyActionUpdate,
	)
	if isAllowedErr != nil || !allowed {
		api.Logger.Error("Access denied to perform action", "error", isAllowedErr)
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Parse and validate request fields
	fields, err := utils.ParseFormFields(
		c,
		nil,
		[]string{"effect", "action", "resource", "principal", "resource_id", "role_id", "workspace_user_id"},
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
	if handleOptionalPolicyFieldsErr := api.handleOptionalPolicyFields(policy, fields); handleOptionalPolicyFieldsErr != nil {
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
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_updated"),
		Data:    policyResponse,
	})
}

// PoliciesDestroy deletes a policy.
func (api *APIControllers) PoliciesDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	policy, policyOk := c.Locals("policy").(*db.Policy)

	if !dictOk || !workspaceOk || !userOk || !policyOk {
		api.Logger.Error("Error validating local parameters in PoliciesDestroy")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check permissions
	allowed, err := lib.IsAllowed(
		api.DB,
		user,
		workspace,
		db.PolicyResourcePolicy,
		&policy.ID,
		db.PolicyActionDelete,
	)
	if err != nil || !allowed {
		api.Logger.Error("Access denied to perform action", "error", err)
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
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
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "policy_deleted"),
	})
}

// getApplicablePoliciesForRole returns all applicable policies for a given role.
func (api *APIControllers) getApplicablePoliciesForRole(workspace *db.Workspace, role *db.Role) ([]db.Policy, error) {
	if role.IsOwner {
		return api.DB.GenerateAllPossiblePolicies(workspace.ID, db.PolicyPrincipalRole, &role.ID), nil
	}

	// For non-owner roles, fetch actual policies
	var policies []db.Policy
	err := api.DB.Where("workspace_id = ?", workspace.ID).Find(&policies).Error
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
			if rolePolicy.Resource == everyonePolicy.Resource && rolePolicy.Action == everyonePolicy.Action {
				conflicts = true
				break
			}
		}
		if !conflicts {
			applicablePolicies = append(applicablePolicies, everyonePolicy)
		}
	}

	return applicablePolicies, nil
}

// PoliciesRoleSummary returns a list of policies that apply to each role.
func (api *APIControllers) PoliciesRoleSummary(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		api.Logger.Error("Error validating local parameters in PoliciesRoleSummary")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check permissions
	allowed, err := lib.IsAllowed(
		api.DB,
		user,
		workspace,
		db.PolicyResourcePolicy,
		nil,
		db.PolicyActionRead,
	)
	if err != nil || !allowed {
		api.Logger.Error("Access denied to perform action", "error", err)
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
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
			if userPolicy.Resource == rolePolicy.Resource && userPolicy.Action == rolePolicy.Action {
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
			if policy.Resource == everyonePolicy.Resource && policy.Action == everyonePolicy.Action {
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

// getUserApplicablePolicies returns all applicable policies for a given user.
func (api *APIControllers) getUserApplicablePolicies(
	workspace *db.Workspace,
	workspaceUser *db.WorkspaceUser,
	isOwner bool,
) ([]db.Policy, error) {
	// Fetch all policies for the workspace
	var policies []db.Policy
	if err := api.DB.Where("workspace_id = ?", workspace.ID).Find(&policies).Error; err != nil {
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
			db.PolicyResourceWorkspaceOwnership,
			db.PolicyResourceEditorScript,
			db.PolicyResourceWorkflow,
			db.PolicyResourceConnection,
			db.PolicyResourceRepository,
			db.PolicyResourceRepositoryObject,
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
						WorkspaceID: &workspace.ID,
						RoleID:      &ownerRole.ID,
					})
				}
			}
		}
	}

	return applicablePolicies, nil
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
		roles = append(roles, userRole.Role.Role)
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
		resourceIDPtr, decodeResourceIDErr := lib.DecodeSqidBasedOnResourceType(
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
	allowed, err := lib.IsAllowed(
		api.DB,
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
