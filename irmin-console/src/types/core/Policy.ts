import { Role } from './Role';

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
  /** Being undefined means the policy is applied to all resources of the given type */
  resourceId?: string;
  /** Used to give a policy to a specific role */
  roleId?: string;
  /** Used to give a policy to a specific workspace user */
  workspaceUserId?: string;
  /** Used to specify which workspace the policy is applied to */
  workspaceId?: string;
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
