package irminmodels

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
	// PolicyResourceScript represents stored script resource.
	PolicyResourceScript PolicyResource = "script"
	// PolicyResourceQuery represents a stored query resource.
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
	// PolicyResourceWorkspaceTag represents a workspace tag resource.
	PolicyResourceWorkspaceTag PolicyResource = "workspace_tag"
)

// PolicyPrincipal specifies which group of users the policy is applied to.
type PolicyPrincipal string

const (
	// PolicyPrincipalWorkspaceUser represents a policy applied to a specific workspace user.
	PolicyPrincipalWorkspaceUser PolicyPrincipal = "workspace_user"
	// PolicyPrincipalRole represents a policy applied to a specific role.
	PolicyPrincipalRole PolicyPrincipal = "role"
	// PolicyPrincipalEveryone represents a policy applied to everyone.
	PolicyPrincipalEveryone PolicyPrincipal = "everyone"
)

// Policy represents a policy in the API response.
type Policy struct {
	// ID is the unique identifier for the policy
	ID string `json:"id"                    validate:"required,validsqid=policies"                                                                                                                                                                                             example:"pol_8x2m9k4n7p5q"`
	// Effect specifies whether the policy is an allow or deny policy
	Effect PolicyEffect `json:"effect"                validate:"required,oneof=allow deny"                                                                                                                                                                                               example:"allow"`
	// Action specifies the action that the policy is applied to
	Action PolicyAction `json:"action"                validate:"required,oneof=create read update delete"                                                                                                                                                                                example:"read"`
	// Resource specifies the resource type that the policy is applied to
	Resource PolicyResource `json:"resource"              validate:"required,oneof=workspace script query workflow workflow_run connection repository repository_branch repository_tag repository_commit repository_object user policy invite audit_log documentation billing workspace_tag" example:"repository"`
	// ResourceID is used to specify which resource the policy is applied to.
	// When undefined, the policy is applied to all resources of the given type.
	//
	// It is applicable for:
	// - queries
	// - workflows
	// - connections
	// - repositories
	// - workspace tags
	// - users
	//
	// It is not applicable for:
	// - workspaces (policies are workspace scoped)
	// - policies
	// - invites
	// - audit logs
	// - editor scripts
	// - documentation
	// - billing
	//
	// Note that some resources point to their parent resource's ID:
	// - repository objects, branches, tags, and commits point to their repository's ID
	// - workflow runs point to their workflow's ID
	ResourceID *string `json:"resource_id,omitempty"                                                                                                                                                                                                                                    example:"repo_8x2m9k4n7p5q"`
	// Principal specifies which group of users the policy is applied to
	Principal PolicyPrincipal `json:"principal"             validate:"required,oneof=workspace_user role everyone"                                                                                                                                                                             example:"role"`
	// Role is used to give a policy to a specific role
	Role *Role `json:"role,omitempty"`
	// User is used to give a policy to a specific workspace user
	User *User `json:"user,omitempty"`
}

// RolePolicySummary represents a summary of a role's policies.
type RolePolicySummary struct {
	Role     Role     `json:"role"     validate:"required"`
	IsOwner  bool     `json:"is_owner"                          example:"false"`
	Policies []Policy `json:"policies" validate:"required,dive"`
}

// UserPolicySummary represents a summary of a user's policies.
type UserPolicySummary struct {
	UserID   string   `json:"user_id"  validate:"required,validsqid=users"      example:"usr_2k8n9q1m7p3x4z"`
	Email    string   `json:"email"    validate:"required,email"                example:"john.doe@example.com"`
	IsOwner  bool     `json:"is_owner"                                          example:"false"`
	RoleIDs  []string `json:"role_ids" validate:"required,dive,validsqid=roles" example:"role_2a8m5x9n4p7s,role_3b9n6y0o5q8t"`
	Policies []Policy `json:"policies" validate:"required,dive"`
}

// PolicyResourceOption represents a policy resource option.
type PolicyResourceOption struct {
	ID    string `json:"id"    validate:"required"         example:"repo_8x2m9k4n7p5q"`
	Label string `json:"label" validate:"required,max=100" example:"Customer Analytics Repository"`
}

// PolicyResourceOptions represents all possible policy resource options for a given workspace.
type PolicyResourceOptions struct {
	Queries      []PolicyResourceOption `json:"queries"      validate:"required,dive"`
	Scripts      []PolicyResourceOption `json:"scripts"      validate:"required,dive"`
	Workflows    []PolicyResourceOption `json:"workflows"    validate:"required,dive"`
	Connections  []PolicyResourceOption `json:"connections"  validate:"required,dive"`
	Repositories []PolicyResourceOption `json:"repositories" validate:"required,dive"`
	Users        []PolicyResourceOption `json:"users"        validate:"required,dive"`
	Tags         []PolicyResourceOption `json:"tags"         validate:"required,dive"`
}
