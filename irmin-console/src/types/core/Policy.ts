import type { Role } from './Role';
import type { User } from './User';

/**
 * Policy effect - allow or deny
 */
export type PolicyEffect = 'allow' | 'deny';

/**
 * Policy action types
 */
export type PolicyAction = 'create' | 'read' | 'update' | 'delete';

/**
 * Policy resource types
 */
export type PolicyResource =
  | 'workspace'
  | 'script'
  | 'query'
  | 'workflow'
  | 'workflow_run'
  | 'connection'
  | 'repository'
  | 'repository_branch'
  | 'repository_tag'
  | 'repository_commit'
  | 'repository_object'
  | 'user'
  | 'policy'
  | 'invite'
  | 'audit_log'
  | 'documentation'
  | 'billing'
  | 'workspace_tag'
  | 'ai_application';

/**
 * Policy principal types
 */
export type PolicyPrincipal = 'workspace_user' | 'role' | 'everyone';

/**
 * Policy represents an access control policy
 */
export interface Policy {
  /** Unique identifier for the policy */
  id: string;
  /** Specifies whether the policy is an allow or deny policy */
  effect: PolicyEffect;
  /** Specifies the action that the policy is applied to */
  action: PolicyAction;
  /** Specifies the resource type that the policy is applied to */
  resource: PolicyResource;
  /** Specifies which group of users the policy is applied to */
  principal: PolicyPrincipal;
  /**
   * Resource ID is used to specify which resource the policy is applied to.
   * When undefined, the policy is applied to all resources of the given type.
   *
   * It is applicable for:
   * - queries
   * - workflows
   * - connections
   * - repositories
   * - workspace tags
   * - users
   *
   * It is not applicable for:
   * - workspaces (policies are workspace scoped)
   * - policies
   * - invites
   * - audit logs
   * - editor scripts
   * - documentation
   * - billing
   * - assistant
   *
   * Note that some resources point to their parent resource's ID:
   * - repository objects, branches, tags, and commits point to their repository's ID
   * - workflow runs point to their workflow's ID
   */
  resourceId?: string;
  /** Used to give a policy to a specific role */
  role?: Role;
  /** Used to give a policy to a specific workspace user */
  user?: User;
}

/**
 * Role policy summary
 */
export interface RolePolicySummary {
  role: Role;
  is_owner: boolean;
  policies: Policy[];
}

/**
 * User policy summary
 */
export interface UserPolicySummary {
  user_id: string;
  email: string;
  is_owner: boolean;
  role_ids: string[];
  policies: Policy[];
}

/**
 * Policy resource option for dropdowns
 */
interface PolicyResourceOption {
  id: string;
  label: string;
}

/**
 * All policy resource options
 */
export interface PolicyResourceOptions {
  queries: PolicyResourceOption[];
  scripts: PolicyResourceOption[];
  workflows: PolicyResourceOption[];
  connections: PolicyResourceOption[];
  repositories: PolicyResourceOption[];
  users: PolicyResourceOption[];
  tags: PolicyResourceOption[];
}
