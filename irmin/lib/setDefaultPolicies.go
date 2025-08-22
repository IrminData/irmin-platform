package lib

import (
	"irmin-api/db"

	"gorm.io/gorm"
)

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
		db.PolicyResourceWorkspaceTag,
		db.PolicyResourceUser,
		db.PolicyResourcePolicy,
		db.PolicyResourceInvite,
		db.PolicyResourceAuditLog,
		db.PolicyResourceDocumentation,
		db.PolicyResourceBilling,
		db.PolicyResourceAssistant,
	}
}

// createPoliciesBatch creates multiple policies in a single database operation.
func createPoliciesBatch(
	dbConn *gorm.DB,
	policies []db.Policy,
) error {
	return dbConn.Create(&policies).Error
}

// preparePoliciesForResources prepares a batch of policies for a list of resources with specified actions.
func preparePoliciesForResources(
	resources []db.PolicyResource,
	actions []db.PolicyAction,
	roleID *uint,
	workspaceID uint,
) []db.Policy {
	var policies []db.Policy
	for _, res := range resources {
		for _, act := range actions {
			policies = append(policies, db.Policy{
				Effect:      db.PolicyEffectAllow,
				Action:      act,
				Resource:    res,
				ResourceID:  nil,
				Principal:   db.PolicyPrincipalRole,
				RoleID:      roleID,
				WorkspaceID: workspaceID,
			})
		}
	}
	return policies
}

// prepareReadPoliciesForResources prepares a batch of read-only policies for a list of resources.
func prepareReadPoliciesForResources(
	resources []db.PolicyResource,
	roleID *uint,
	workspaceID uint,
) []db.Policy {
	return preparePoliciesForResources(resources, []db.PolicyAction{db.PolicyActionRead}, roleID, workspaceID)
}

// setOwnerPolicies sets all policies for the owner role.
func setOwnerPolicies(dbConn *gorm.DB, roleID *uint, workspaceID uint) error {
	resources := getAllResources()
	actions := []db.PolicyAction{
		db.PolicyActionCreate,
		db.PolicyActionRead,
		db.PolicyActionUpdate,
		db.PolicyActionDelete,
	}

	policies := preparePoliciesForResources(resources, actions, roleID, workspaceID)
	return createPoliciesBatch(dbConn, policies)
}

// setAdminPolicies sets all policies for the admin role.
func setAdminPolicies(dbConn *gorm.DB, roleID *uint, workspaceID uint) error {
	// Admin has the same permissions as owner
	return setOwnerPolicies(dbConn, roleID, workspaceID)
}

// setViewerPolicies sets all policies for the viewer role.
func setViewerPolicies(dbConn *gorm.DB, roleID *uint, workspaceID uint) error {
	// Viewers can read all resources
	policies := prepareReadPoliciesForResources(getAllResources(), roleID, workspaceID)
	return createPoliciesBatch(dbConn, policies)
}

// setBillingPolicies sets all policies for the billing role.
func setBillingPolicies(dbConn *gorm.DB, roleID *uint, workspaceID uint) error {
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

	billingPolicies := preparePoliciesForResources(billingResources, actions, roleID, workspaceID)

	// Read-only access to workspace and user resources
	readOnlyResources := []db.PolicyResource{
		db.PolicyResourceWorkspace,
		db.PolicyResourceUser,
	}

	readOnlyPolicies := prepareReadPoliciesForResources(readOnlyResources, roleID, workspaceID)

	// Combine all policies into a new slice
	combinedPolicies := make([]db.Policy, 0, len(billingPolicies)+len(readOnlyPolicies))
	combinedPolicies = append(combinedPolicies, billingPolicies...)
	combinedPolicies = append(combinedPolicies, readOnlyPolicies...)
	return createPoliciesBatch(dbConn, combinedPolicies)
}

// setAssistantPolicies sets all policies for the assistant role.
func setAssistantPolicies(dbConn *gorm.DB, roleID *uint, workspaceID uint) error {
	// Assistant has full access to assistant resource
	assistantResources := []db.PolicyResource{
		db.PolicyResourceAssistant,
	}

	assistantPolicies := preparePoliciesForResources(
		assistantResources,
		[]db.PolicyAction{db.PolicyActionRead, db.PolicyActionCreate, db.PolicyActionUpdate, db.PolicyActionDelete},
		roleID,
		workspaceID,
	)

	return createPoliciesBatch(dbConn, assistantPolicies)
}

// setWorkspaceWidePolicies sets policies that apply to everyone in the workspace.
func setWorkspaceWidePolicies(dbConn *gorm.DB, workspaceID uint) error {
	policies := []db.Policy{{
		Effect:      db.PolicyEffectAllow,
		Action:      db.PolicyActionRead,
		Resource:    db.PolicyResourceWorkspace,
		ResourceID:  nil,
		Principal:   db.PolicyPrincipalEveryone,
		RoleID:      nil,
		WorkspaceID: workspaceID,
	}}
	return createPoliciesBatch(dbConn, policies)
}

// setEditorPolicies sets all policies for the editor role.
func setEditorPolicies(dbConn *gorm.DB, roleID *uint, workspaceID uint) error {
	// Editor has full access to workflows and repositories, but limited access to other resources
	workflowResources := []db.PolicyResource{
		db.PolicyResourceWorkflow,
		db.PolicyResourceWorkflowRun,
		db.PolicyResourceEditorScript,
		db.PolicyResourceQuery,
		db.PolicyResourceWorkspaceTag,
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

	workflowPolicies := preparePoliciesForResources(workflowResources, workflowActions, roleID, workspaceID)
	repositoryPolicies := preparePoliciesForResources(repositoryResources, workflowActions, roleID, workspaceID)

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

	readOnlyPolicies := prepareReadPoliciesForResources(readOnlyResources, roleID, workspaceID)

	// Combine all policies into a new slice
	combinedPolicies := make([]db.Policy, 0, len(workflowPolicies)+len(repositoryPolicies)+len(readOnlyPolicies))
	combinedPolicies = append(combinedPolicies, workflowPolicies...)
	combinedPolicies = append(combinedPolicies, repositoryPolicies...)
	combinedPolicies = append(combinedPolicies, readOnlyPolicies...)
	return createPoliciesBatch(dbConn, combinedPolicies)
}

// SetDefaultPolicies creates a set of default policies for a newly created workspace.
// It will only insert each policy if it does not already exist for the given workspace.
// If any policies already exist for the workspace, this function will do nothing.
//
// Parameters:
//   - dbConn: the database connection to use (can be a transaction).
//   - workspaceID: the ID of the workspace for which to create default policies.
//   - overridePolicies: if true, the default policies will be overridden. If false, the default policies will only be created if no policies already exist for the workspace.
//
// Returns:
//   - error: if any database operation fails.
func SetDefaultPolicies(dbConn *gorm.DB, workspaceID uint, overridePolicies bool) error {
	// Check if any policies exist for this workspace
	var count int64
	if workspacePoliciesCountErr := dbConn.Model(&db.Policy{}).Where(&db.Policy{WorkspaceID: workspaceID}).Count(&count).Error; workspacePoliciesCountErr != nil {
		return workspacePoliciesCountErr
	}
	if count > 0 && !overridePolicies {
		// Policies already exist, skip setting defaults
		return nil
	}

	// If overridePolicies is true, delete all existing policies for this workspace
	if overridePolicies && count > 0 {
		if deleteErr := dbConn.Where(&db.Policy{WorkspaceID: workspaceID}).Delete(&db.Policy{}).Error; deleteErr != nil {
			return deleteErr
		}
	}

	// Set workspace-wide policies that apply to everyone
	if err := setWorkspaceWidePolicies(dbConn, workspaceID); err != nil {
		return err
	}

	// Retrieve all roles
	var roles []db.Role
	if rolesErr := dbConn.Find(&roles).Error; rolesErr != nil {
		return rolesErr
	}

	// Set policies for each role
	for _, role := range roles {
		var err error
		switch role.Role {
		case "owner":
			err = setOwnerPolicies(dbConn, &role.ID, workspaceID)
		case "admin":
			err = setAdminPolicies(dbConn, &role.ID, workspaceID)
		case "editor":
			err = setEditorPolicies(dbConn, &role.ID, workspaceID)
		case "viewer":
			err = setViewerPolicies(dbConn, &role.ID, workspaceID)
		case "billing":
			err = setBillingPolicies(dbConn, &role.ID, workspaceID)
		case "assistant":
			err = setAssistantPolicies(dbConn, &role.ID, workspaceID)
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
