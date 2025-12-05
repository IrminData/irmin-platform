/**
 * Centralized query keys for React Query
 *
 * This file contains all query keys used throughout the application.
 * Import these keys in your hooks and components for consistent query management.
 */
import type { LogsForType } from '@/hooks/api/useLogEvents';

import type { ConnectionFieldValues } from '@/types/core/Connection';
import type { SearchFilters } from '@/types/core/Search';

// Workspace related query keys
export const workspacesQueryKey = ['workspaces'] as const;

export const workspaceQueryKey = (slug: string) => ['workspace', slug] as const;

export const workspaceSearchQueryKey = (
  workspaceSlug: string,
  params: SearchFilters
) => ['workspace-search', workspaceSlug, params] as const;

export const workspaceTagsQueryKey = (workspaceSlug: string, tagID?: string) =>
  ['workspace-tags', workspaceSlug, tagID] as const;

// Repository related query keys
export const repositoriesQueryKey = (workspaceSlug: string) =>
  ['repositories', workspaceSlug] as const;

export const repositoryQueryKey = (workspaceSlug: string, slug: string) =>
  ['repository', workspaceSlug, slug] as const;

export const repositoryBranchesQueryKey = (
  workspaceSlug: string,
  repositorySlug: string
) => ['repository-branches', workspaceSlug, repositorySlug] as const;

export const repositoryCommitsQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  branch?: string,
  after?: string
) =>
  ['repository-commits', workspaceSlug, repositorySlug, branch, after] as const;

export const repositoryTagsQueryKey = (
  workspaceSlug: string,
  repositorySlug: string
) => ['repository-tags', workspaceSlug, repositorySlug] as const;

export const repositoryObjectQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  ref: string,
  path: string
) => ['repository-object', workspaceSlug, repositorySlug, ref, path] as const;

export const repositoryObjectContentQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  ref: string,
  path: string
) =>
  [
    'repository-object-content',
    workspaceSlug,
    repositorySlug,
    ref,
    path,
  ] as const;

export const repositoryObjectSchemaQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  ref: string,
  path: string
) =>
  [
    'repository-object-schema',
    workspaceSlug,
    repositorySlug,
    ref,
    path,
  ] as const;

export const repositoryObjectHistoryQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  ref: string,
  path: string
) =>
  [
    'repository-object-history',
    workspaceSlug,
    repositorySlug,
    ref,
    path,
  ] as const;

export const repositoryDiffQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  baseRef: string,
  compareRef: string
) =>
  [
    'repository-diff',
    workspaceSlug,
    repositorySlug,
    baseRef,
    compareRef,
  ] as const;

export const repositoryDiffContentQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  baseRef: string,
  compareRef: string,
  path: string
) =>
  [
    'repository-diff-content',
    workspaceSlug,
    repositorySlug,
    baseRef,
    compareRef,
    path,
  ] as const;

export const repositoryUncommittedChangesQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  ref: string
) =>
  [
    'repository-uncommitted-changes',
    workspaceSlug,
    repositorySlug,
    ref,
  ] as const;

// Workflow related query keys
export const workflowsQueryKey = (workspaceSlug: string, type?: string) =>
  ['workflows', workspaceSlug, type] as const;

export const workflowQueryKey = (workspaceSlug: string, workflowID: string) =>
  ['workflow', workspaceSlug, workflowID] as const;

export const workflowRunsQueryKey = (
  workspaceSlug: string,
  workflowID: string,
  page?: number
) => ['workflow-runs', workspaceSlug, workflowID, page] as const;

export const workflowRunQueryKey = (
  workspaceSlug: string,
  workflowID: string,
  runID: string
) => ['workflow-run', workspaceSlug, workflowID, runID] as const;

// Connection related query keys
export const connectionsQueryKey = (workspaceSlug: string) =>
  ['connections', workspaceSlug] as const;

export const connectionQueryKey = (
  workspaceSlug: string,
  connectionID: string
) => ['connection', workspaceSlug, connectionID] as const;

export const connectionSchemaQueryKey = (
  workspaceSlug: string,
  connectionID: string,
  operationMethod?: string,
  paths?: string[]
) =>
  [
    'connection-schema',
    workspaceSlug,
    connectionID,
    operationMethod ?? 'pull',
    paths && paths.length > 0 ? [...paths].sort().join(',') : '',
  ] as const;

export const connectorConfigurationQueryKey = (
  type: 'details' | 'settings',
  connectorID?: string,
  details?: ConnectionFieldValues,
  settings?: ConnectionFieldValues
) => ['connector-configuration', connectorID, type, details, settings] as const;

// Connector related query keys
export const connectorsQueryKey = ['connectors'] as const;

export const connectorQueryKey = (connectorID: string) =>
  ['connector', connectorID] as const;

// Policy related query keys
export const policiesQueryKey = (
  workspaceSlug: string,
  effect?: string,
  action?: string,
  resource?: string,
  resourceId?: string,
  principal?: string,
  roleId?: string,
  userId?: string
) =>
  [
    'policies',
    workspaceSlug,
    effect,
    action,
    resource,
    resourceId,
    principal,
    roleId,
    userId,
  ] as const;

export const policyQueryKey = (workspaceSlug: string, policyId?: string) =>
  ['policy', workspaceSlug, policyId] as const;

export const policySummaryQueryKey = (workspaceSlug: string) =>
  ['policy-summary', workspaceSlug] as const;

export const policyResourceOptionsQueryKey = (workspaceSlug: string) =>
  ['policy-resource-options', workspaceSlug] as const;

// User related query keys
export const usersQueryKey = (workspaceSlug: string) =>
  ['users', workspaceSlug] as const;

export const userQueryKey = (id: string, workspaceSlug: string) =>
  ['user', id, workspaceSlug] as const;

// Invite related query keys
export const inviteInboxQueryKey = ['invite-inbox'] as const;

export const invitesQueryKey = (workspaceSlug: string) =>
  ['invites', workspaceSlug] as const;

export const inviteQueryKey = (inviteID: string) =>
  ['invite', inviteID] as const;

// Role related query keys
export const rolesQueryKey = ['roles'] as const;

// Credentials related query keys
export const credentialsQueryKey = ['credentials'] as const;

// Scripts related query keys
export const scriptsQueryKey = (workspaceSlug: string, scriptId?: string) =>
  ['scripts', workspaceSlug, scriptId] as const;

// Log related query keys
export const logEventsQueryKey = (
  workspaceSlug: string,
  logsForType: LogsForType,
  logsFor: string,
  page: number,
  search?: string
) => ['log-events', workspaceSlug, logsForType, logsFor, page, search] as const;

// Stored queries related query keys
export const storedQueriesQueryKey = (workspaceSlug: string) =>
  ['stored-queries', workspaceSlug] as const;

// Agent related query keys
export const aiConversationsQueryKey = (
  workspaceSlug: string,
  pagination?: {
    page?: number;
    limit?: number;
    sortBy?: 'title' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    agentId?: string;
  }
) => ['ai-conversations', workspaceSlug, pagination] as const;

export const aiConversationQueryKey = (
  workspaceSlug: string,
  conversationID: string
) => ['ai-conversation', workspaceSlug, conversationID] as const;

export const aiConversationMessagesQueryKey = (
  workspaceSlug: string,
  conversationID: string
) => ['ai-conversation-messages', workspaceSlug, conversationID] as const;
