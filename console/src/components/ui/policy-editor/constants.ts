import type {
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

export const POLICY_ACTIONS: PolicyAction[] = [
  'create',
  'read',
  'update',
  'delete',
];

export const POLICY_EFFECTS: PolicyEffect[] = ['allow', 'deny'];

export const POLICY_PRINCIPALS: PolicyPrincipal[] = [
  'workspace_user',
  'role',
  'everyone',
];

export const POLICY_RESOURCES: PolicyResource[] = [
  'workspace',
  'script',
  'query',
  'workflow',
  'workflow_run',
  'connection',
  'repository',
  'repository_branch',
  'repository_tag',
  'repository_commit',
  'repository_object',
  'workspace_tag',
  'user',
  'policy',
  'invite',
  'audit_log',
  'documentation',
  'billing',
  'ai_application',
];
