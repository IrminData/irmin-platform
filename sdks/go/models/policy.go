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
	// PolicyResourceWorkspaceOwnership represents workspace ownership resource.
	PolicyResourceWorkspaceOwnership PolicyResource = "workspace_ownership"
	// PolicyResourceEditorScript represents script editor resource.
	PolicyResourceEditorScript PolicyResource = "editor_script"
	// PolicyResourceWorkflow represents a workflow resource.
	PolicyResourceWorkflow PolicyResource = "workflow"
	// PolicyResourceConnection represents a connection resource.
	PolicyResourceConnection PolicyResource = "connection"
	// PolicyResourceRepository represents a repository resource.
	PolicyResourceRepository PolicyResource = "repository"
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
	ID string `json:"id"`
	// Effect specifies whether the policy is an allow or deny policy
	Effect PolicyEffect `json:"effect"`
	// Action specifies the action that the policy is applied to
	Action PolicyAction `json:"action"`
	// Resource specifies the resource type that the policy is applied to
	Resource PolicyResource `json:"resource"`
	// Principal specifies which group of users the policy is applied to
	Principal PolicyPrincipal `json:"principal"`
	// ResourceID being nil means the policy is applied to all resources of the given type
	ResourceID *string `json:"resource_id,omitempty"`
	// RoleID is used to give a policy to a specific role
	RoleID *string `json:"role_id,omitempty"`
	// WorkspaceUserID is used to give a policy to a specific workspace user
	WorkspaceUserID *string `json:"workspace_user_id,omitempty"`
	// WorkspaceID is used to specify which workspace the policy is applied to
	WorkspaceID *string `json:"workspace_id,omitempty"`
}

// RolePolicySummary represents a summary of a role's policies.
type RolePolicySummary struct {
	Role     Role     `json:"role"`
	IsOwner  bool     `json:"is_owner"`
	Policies []Policy `json:"policies"`
}

// UserPolicySummary represents a summary of a user's policies.
type UserPolicySummary struct {
	UserID   string   `json:"user_id"`
	Email    string   `json:"email"`
	IsOwner  bool     `json:"is_owner"`
	RoleIDs  []string `json:"role_ids"`
	Policies []Policy `json:"policies"`
}
