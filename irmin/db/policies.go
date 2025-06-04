package db

import "gorm.io/gorm"

// PolicyPrincipal specifies which group of users the policy is applied to, like a workspace user or a role.
type PolicyPrincipal string

const (
	// PolicyPrincipalWorkspaceUser represents a policy applied to a specific workspace user.
	PolicyPrincipalWorkspaceUser PolicyPrincipal = "workspace_user"
	// PolicyPrincipalRole represents a policy applied to a specific role.
	PolicyPrincipalRole PolicyPrincipal = "role"
	// PolicyPrincipalEveryone represents a policy applied to everyone.
	PolicyPrincipalEveryone PolicyPrincipal = "everyone"
)

// PolicyEffect specifies whether the policy is an allow or deny policy.
type PolicyEffect string

const (
	// PolicyEffectAllow represents a policy that allows an action.
	PolicyEffectAllow PolicyEffect = "allow"
	// PolicyEffectDeny represents a policy that denies an action.
	PolicyEffectDeny PolicyEffect = "deny"
)

// PolicyAction specifies the action that the policy is applied to.
type PolicyAction string

const (
	// PolicyActionCreate represents the create action.
	PolicyActionCreate PolicyAction = "create"
	// PolicyActionRead represents the read action.
	PolicyActionRead PolicyAction = "read"
	// PolicyActionUpdate represents the update action.
	PolicyActionUpdate PolicyAction = "update"
	// PolicyActionDelete represents the delete action.
	PolicyActionDelete PolicyAction = "delete"
)

// PolicyResource specifies the resource type that the policy is applied to.
type PolicyResource string

const (
	// PolicyResourceWorkspace represents a workspace resource.
	PolicyResourceWorkspace PolicyResource = "workspace"
	// PolicyResourceEditorScript represents script editor resource.
	PolicyResourceEditorScript PolicyResource = "editor_script"
	// PolicyResourceQuery represents a query resource.
	PolicyResourceQuery PolicyResource = "query"
	// PolicyResourceWorkflow represents a workflow resource.
	PolicyResourceWorkflow PolicyResource = "workflow"
	// PolicyResourceWorkflowRun represents a workflow run resource.
	PolicyResourceWorkflowRun PolicyResource = "workflow_run"
	// PolicyResourceConnection represents a connection resource.
	PolicyResourceConnection PolicyResource = "connection"
	// PolicyResourceRepository represents a repository resource.
	PolicyResourceRepository PolicyResource = "repository"
	// PolicyResourceRepositoryBranch represents a repository branch resource.
	PolicyResourceRepositoryBranch PolicyResource = "repository_branch"
	// PolicyResourceRepositoryTag represents a repository tag resource.
	PolicyResourceRepositoryTag PolicyResource = "repository_tag"
	// PolicyResourceRepositoryCommit represents a repository commit resource.
	PolicyResourceRepositoryCommit PolicyResource = "repository_commit"
	// PolicyResourceRepositoryObject represents a repository object resource.
	PolicyResourceRepositoryObject PolicyResource = "repository_object"
	// PolicyResourceUser represents a user resource.
	PolicyResourceUser PolicyResource = "user"
	// PolicyResourcePolicy represents a policy resource.
	PolicyResourcePolicy PolicyResource = "policy"
	// PolicyResourceInvite represents an invite resource.
	PolicyResourceInvite PolicyResource = "invite"
	// PolicyResourceAuditLog represents an audit log resource.
	PolicyResourceAuditLog PolicyResource = "audit_log"
	// PolicyResourceDocumentation represents a documentation resource.
	PolicyResourceDocumentation PolicyResource = "documentation"
	// PolicyResourceBilling represents billing and subscription management resource.
	PolicyResourceBilling PolicyResource = "billing"
)

// Policy is a policy that is applied to a resource.
type Policy struct {
	gorm.Model

	// Effect specifies whether the policy is an allow or deny policy
	Effect PolicyEffect `json:"effect"`

	// Action specifies the action that the policy is applied to (create, read, update, delete)
	Action PolicyAction `gorm:"index:idx_policy_unique,priority:5"`

	// Resource specifies the resource type that the policy is applied to (workspace, workflow, etc.)
	Resource PolicyResource `gorm:"index:idx_policy_unique,priority:3"`

	// ResourceID being nil means the policy is applied to all resources of the given type.
	// When set, the policy applies only to the specific resource identified by this ID.
	ResourceID *uint `gorm:"index:idx_policy_unique,priority:4"`

	// WorkspaceID is used to specify which workspace the policy is applied to.
	// This field is required for workspace-scoped policies.
	WorkspaceID uint      `gorm:"index:idx_policy_unique,priority:1"`
	Workspace   Workspace `gorm:"foreignKey:WorkspaceID"             json:"workspace"`

	// Principal specifies which group of users the policy is applied to (workspace_user, role, or everyone)
	Principal PolicyPrincipal `gorm:"index:idx_policy_unique,priority:6"`

	// WorkspaceUserID is used to give a policy to a specific workspace user.
	// This field is required when Principal is set to PolicyPrincipalWorkspaceUser.
	WorkspaceUserID *uint          `gorm:"index:idx_policy_unique,priority:2"`
	WorkspaceUser   *WorkspaceUser `gorm:"foreignKey:WorkspaceUserID"         json:"workspace_user"`

	// RoleID is used to give a policy to a specific role.
	// This field is required when Principal is set to PolicyPrincipalRole.
	RoleID *uint `gorm:"index:idx_policy_unique,priority:2"`
	Role   *Role `gorm:"foreignKey:RoleID"                  json:"role"`
}

// PolicyGenerationOptions specifies options for generating policies.
type PolicyGenerationOptions struct {
	// IncludeResources specifies which resources to include in the generated policies.
	// If nil, all resources will be included.
	IncludeResources []PolicyResource
	// IncludeActions specifies which actions to include in the generated policies.
	// If nil, all actions will be included.
	IncludeActions []PolicyAction
	// Effect specifies the effect to use for all generated policies.
	// If not set, PolicyEffectAllow will be used.
	Effect PolicyEffect
}

// DefaultPolicyGenerationOptions returns the default options for policy generation.
func DefaultPolicyGenerationOptions() PolicyGenerationOptions {
	return PolicyGenerationOptions{
		Effect: PolicyEffectAllow,
	}
}

// GenerateAllPossiblePolicies generates all possible policy combinations for a given workspace and principal.
func (d *Database) GenerateAllPossiblePolicies(
	workspaceID uint,
	principal PolicyPrincipal,
	principalID *uint,
	opts ...PolicyGenerationOptions,
) []Policy {
	// Use default options if none provided
	options := DefaultPolicyGenerationOptions()
	if len(opts) > 0 {
		options = opts[0]
	}

	// Get resources to include
	resources := options.IncludeResources
	if resources == nil {
		resources = []PolicyResource{
			PolicyResourceWorkspace,
			PolicyResourceEditorScript,
			PolicyResourceQuery,
			PolicyResourceWorkflow,
			PolicyResourceWorkflowRun,
			PolicyResourceConnection,
			PolicyResourceRepository,
			PolicyResourceRepositoryBranch,
			PolicyResourceRepositoryTag,
			PolicyResourceRepositoryCommit,
			PolicyResourceRepositoryObject,
			PolicyResourceUser,
			PolicyResourcePolicy,
			PolicyResourceInvite,
			PolicyResourceAuditLog,
			PolicyResourceDocumentation,
			PolicyResourceBilling,
		}
	}

	// Get actions to include
	actions := options.IncludeActions
	if actions == nil {
		actions = []PolicyAction{
			PolicyActionCreate,
			PolicyActionRead,
			PolicyActionUpdate,
			PolicyActionDelete,
		}
	}

	// Generate base policy template
	basePolicy := Policy{
		Effect:      options.Effect,
		Principal:   principal,
		WorkspaceID: workspaceID,
	}

	// Set principal-specific ID
	switch principal {
	case PolicyPrincipalRole:
		basePolicy.RoleID = principalID
	case PolicyPrincipalWorkspaceUser:
		basePolicy.WorkspaceUserID = principalID
	case PolicyPrincipalEveryone:
		basePolicy.WorkspaceUserID = nil
		basePolicy.RoleID = nil
	}

	// Generate all combinations
	policies := make([]Policy, 0, len(resources)*len(actions))
	for _, resource := range resources {
		for _, action := range actions {
			policy := basePolicy
			policy.Action = action
			policy.Resource = resource
			policies = append(policies, policy)
		}
	}

	return policies
}
