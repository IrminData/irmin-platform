package lib

import (
	"irmin-api/db"
)

// createPolicy is a helper function to create a single policy.
func createPolicy(
	d *db.Database,
	effect db.PolicyEffect,
	action db.PolicyAction,
	resource db.PolicyResource,
	roleID *uint,
	workspaceID uint,
) error {
	p := db.Policy{
		Effect:      effect,
		Action:      action,
		Resource:    resource,
		ResourceID:  nil,
		Principal:   db.PolicyPrincipalRole,
		RoleID:      roleID,
		WorkspaceID: &workspaceID,
	}
	return d.Create(&p).Error
}

// createPoliciesForResources creates policies for a list of resources with specified actions.
func createPoliciesForResources(
	d *db.Database,
	resources []db.PolicyResource,
	actions []db.PolicyAction,
	roleID *uint,
	workspaceID uint,
) error {
	for _, res := range resources {
		for _, act := range actions {
			if err := createPolicy(d, db.PolicyEffectAllow, act, res, roleID, workspaceID); err != nil {
				return err
			}
		}
	}
	return nil
}

// createReadPoliciesForResources creates read-only policies for a list of resources.
func createReadPoliciesForResources(
	d *db.Database,
	resources []db.PolicyResource,
	roleID *uint,
	workspaceID uint,
) error {
	return createPoliciesForResources(d, resources, []db.PolicyAction{db.PolicyActionRead}, roleID, workspaceID)
}

// getAllResources returns a list of all available resources except billing.
func getAllResources() []db.PolicyResource {
	return []db.PolicyResource{
		db.PolicyResourceWorkspace,
		db.PolicyResourceEditorScript,
		db.PolicyResourceQuery,
		db.PolicyResourceWorkflow,
		db.PolicyResourceWorkflowRun,
		db.PolicyResourceConnection,
		db.PolicyResourceRepository,
		db.PolicyResourceRepositoryBranch,
		db.PolicyResourceRepositoryTag,
		db.PolicyResourceRepositoryCommit,
		db.PolicyResourceRepositoryObject,
		db.PolicyResourceUser,
		db.PolicyResourcePolicy,
		db.PolicyResourceInvite,
		db.PolicyResourceAuditLog,
		db.PolicyResourceDocumentation,
		db.PolicyResourceBilling,
	}
}

// setOwnerPolicies sets all policies for the owner role.
func setOwnerPolicies(d *db.Database, roleID *uint, workspaceID uint) error {
	resources := getAllResources()
	actions := []db.PolicyAction{
		db.PolicyActionCreate,
		db.PolicyActionRead,
		db.PolicyActionUpdate,
		db.PolicyActionDelete,
	}

	return createPoliciesForResources(d, resources, actions, roleID, workspaceID)
}

// setAdminPolicies sets all policies for the admin role.
func setAdminPolicies(d *db.Database, roleID *uint, workspaceID uint) error {
	// Admin has the same permissions as owner
	return setOwnerPolicies(d, roleID, workspaceID)
}

// setViewerPolicies sets all policies for the viewer role.
func setViewerPolicies(d *db.Database, roleID *uint, workspaceID uint) error {
	// Viewers can read all resources
	return createReadPoliciesForResources(d, getAllResources(), roleID, workspaceID)
}

// setBillingPolicies sets all policies for the billing role.
func setBillingPolicies(d *db.Database, roleID *uint, workspaceID uint) error {
	// Billing role has full access to billing resource and read-only access to workspace and user
	billingResources := []db.PolicyResource{
		db.PolicyResourceBilling,
	}

	actions := []db.PolicyAction{
		db.PolicyActionCreate,
		db.PolicyActionRead,
		db.PolicyActionUpdate,
		db.PolicyActionDelete,
	}

	if err := createPoliciesForResources(d, billingResources, actions, roleID, workspaceID); err != nil {
		return err
	}

	// Read-only access to workspace and user resources
	readOnlyResources := []db.PolicyResource{
		db.PolicyResourceWorkspace,
		db.PolicyResourceUser,
	}

	return createReadPoliciesForResources(d, readOnlyResources, roleID, workspaceID)
}

// setWorkspaceWidePolicies sets policies that apply to everyone in the workspace.
func setWorkspaceWidePolicies(d *db.Database, workspaceID uint) error {
	// Everyone can read the workspace resource
	p := db.Policy{
		Effect:      db.PolicyEffectAllow,
		Action:      db.PolicyActionRead,
		Resource:    db.PolicyResourceWorkspace,
		ResourceID:  nil,
		Principal:   db.PolicyPrincipalEveryone,
		RoleID:      nil,
		WorkspaceID: &workspaceID,
	}
	return d.Create(&p).Error
}

// setEditorPolicies sets all policies for the editor role.
func setEditorPolicies(d *db.Database, roleID *uint, workspaceID uint) error {
	// Editor has full access to workflows and repositories, but limited access to other resources
	workflowResources := []db.PolicyResource{
		db.PolicyResourceWorkflow,
		db.PolicyResourceWorkflowRun,
		db.PolicyResourceEditorScript,
		db.PolicyResourceQuery,
	}

	repositoryResources := []db.PolicyResource{
		db.PolicyResourceRepository,
		db.PolicyResourceRepositoryBranch,
		db.PolicyResourceRepositoryTag,
		db.PolicyResourceRepositoryCommit,
		db.PolicyResourceRepositoryObject,
	}

	// Full access to workflow and repository resources
	workflowActions := []db.PolicyAction{
		db.PolicyActionCreate,
		db.PolicyActionRead,
		db.PolicyActionUpdate,
		db.PolicyActionDelete,
	}

	if err := createPoliciesForResources(d, workflowResources, workflowActions, roleID, workspaceID); err != nil {
		return err
	}

	if err := createPoliciesForResources(d, repositoryResources, workflowActions, roleID, workspaceID); err != nil {
		return err
	}

	// Read-only access to other resources
	readOnlyResources := []db.PolicyResource{
		db.PolicyResourceWorkspace,
		db.PolicyResourceConnection,
		db.PolicyResourceUser,
		db.PolicyResourcePolicy,
		db.PolicyResourceInvite,
		db.PolicyResourceAuditLog,
		db.PolicyResourceDocumentation,
	}

	return createReadPoliciesForResources(d, readOnlyResources, roleID, workspaceID)
}

// SetDefaultPolicies creates a set of default policies for a newly created workspace.
// It will only insert each policy if it does not already exist for the given workspace.
// If any policies already exist for the workspace, this function will do nothing.
//
// Parameters:
//   - d: the database instance.
//   - workspaceID: the ID of the workspace for which to create default policies.
//   - overridePolicies: if true, the default policies will be overridden. If false, the default policies will only be created if no policies already exist for the workspace.
//
// Returns:
//   - error: if any database operation fails.
func SetDefaultPolicies(d *db.Database, workspaceID uint, overridePolicies bool) error {
	// Check if any policies exist for this workspace
	var count int64
	if workspacePoliciesCountErr := d.Model(&db.Policy{}).Where("workspace_id = ?", workspaceID).Count(&count).Error; workspacePoliciesCountErr != nil {
		return workspacePoliciesCountErr
	}
	if count > 0 && !overridePolicies {
		// Policies already exist, skip setting defaults
		return nil
	}

	// If overridePolicies is true, delete all existing policies for this workspace
	if overridePolicies && count > 0 {
		if deleteErr := d.Where("workspace_id = ?", workspaceID).Delete(&db.Policy{}).Error; deleteErr != nil {
			return deleteErr
		}
	}

	// Set workspace-wide policies that apply to everyone
	if err := setWorkspaceWidePolicies(d, workspaceID); err != nil {
		return err
	}

	// Retrieve all roles
	var roles []db.Role
	if rolesErr := d.Find(&roles).Error; rolesErr != nil {
		return rolesErr
	}

	// Set policies for each role
	for _, role := range roles {
		var err error
		switch role.Role {
		case "owner":
			err = setOwnerPolicies(d, &role.ID, workspaceID)
		case "admin":
			err = setAdminPolicies(d, &role.ID, workspaceID)
		case "editor":
			err = setEditorPolicies(d, &role.ID, workspaceID)
		case "viewer":
			err = setViewerPolicies(d, &role.ID, workspaceID)
		case "billing":
			err = setBillingPolicies(d, &role.ID, workspaceID)
		case "guest":
			// Guest role has no permissions by default
			continue
		}

		if err != nil {
			return err
		}
	}

	return nil
}
