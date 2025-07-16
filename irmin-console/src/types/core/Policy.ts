import type { Role } from './Role';
import type { User } from './User';

export type PolicyEffect = 'allow' | 'deny';

export type PolicyAction = 'create' | 'read' | 'update' | 'delete';

export type PolicyResource =
  | 'workspace'
  | 'editor_script'
  | 'query'
  | 'workflow'
  | 'workflow_run'
  | 'connection'
  | 'repository'
  | 'repository_branch'
  | 'repository_tag'
  | 'repository_commit'
  | 'repository_object'
  | 'workspace_tag'
  | 'user'
  | 'policy'
  | 'invite'
  | 'audit_log'
  | 'documentation'
  | 'billing';

export type PolicyPrincipal = 'workspace_user' | 'role' | 'everyone';

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

export interface RolePolicySummary {
  role: Role;
  isOwner: boolean;
  policies: Policy[];
}

export interface UserPolicySummary {
  userId: string;
  email: string;
  isOwner: boolean;
  roleIds: string[];
  policies: Policy[];
}

interface PolicyResourceOption {
  id: string;
  label: string;
}

export interface PolicyResourceOptions {
  queries: PolicyResourceOption[];
  workflows: PolicyResourceOption[];
  connections: PolicyResourceOption[];
  repositories: PolicyResourceOption[];
  tags: PolicyResourceOption[];
  users: PolicyResourceOption[];
}
