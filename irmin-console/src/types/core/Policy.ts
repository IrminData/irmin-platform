import { Role } from './Role';
import { User } from './User';

export enum PolicyEffect {
  Allow = 'allow',
  Deny = 'deny',
}

export enum PolicyAction {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export enum PolicyResource {
  Workspace = 'workspace',
  EditorScript = 'editor_script',
  Query = 'query',
  Workflow = 'workflow',
  WorkflowRun = 'workflow_run',
  Connection = 'connection',
  Repository = 'repository',
  RepositoryBranch = 'repository_branch',
  RepositoryTag = 'repository_tag',
  RepositoryCommit = 'repository_commit',
  RepositoryObject = 'repository_object',
  WorkspaceTag = 'workspace_tag',
  User = 'user',
  Policy = 'policy',
  Invite = 'invite',
  AuditLog = 'audit_log',
  Documentation = 'documentation',
  Billing = 'billing',
}

export enum PolicyPrincipal {
  WorkspaceUser = 'workspace_user',
  Role = 'role',
  Everyone = 'everyone',
}

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

export interface PolicyResourceOption {
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
