import { cache } from 'react';

import { getServerCore } from '@/lib/core/serverCore';
import type { Locale } from '@/lib/dict';

import type { AIApplication } from '@/types/core/AIApplication';
import type { Connection } from '@/types/core/Connection';
import type { Repository } from '@/types/core/Repository';
import type { StoredQuery } from '@/types/core/StoredQuery';
import type { User } from '@/types/core/User';
import type { Workflow } from '@/types/core/Workflow';
import type { Workspace } from '@/types/core/Workspace';

/**
 * Read-only entity fetchers used exclusively by `generateMetadata`.
 *
 * Each is wrapped with {@link cache} so the same `(locale, …args)` tuple
 * produces a single network call within one render pass — the workspace
 * layout, the resource layout, and the page component all share results.
 *
 * None of these throw. A failure (auth error, 404, network hiccup) resolves
 * to `null`, letting the caller fall back to a slug-derived placeholder.
 * Metadata must never cause the route itself to crash; the page component
 * handles loading and error surfaces separately.
 */

async function safeFetch<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[metadata] ${label} failed:`, (error as Error).message);
    return null;
  }
}

/** Fetch a workspace by slug. */
export const fetchWorkspaceMeta = cache(
  async (locale: Locale, workspaceSlug: string): Promise<Workspace | null> => {
    return safeFetch('fetchWorkspaceMeta', async () => {
      const core = await getServerCore(locale);
      const res = await core.workspaceService.fetchWorkspace({
        workspaceSlug,
      });
      return res.data ?? null;
    });
  }
);

/** Fetch a repository by workspace + slug. */
export const fetchRepositoryMeta = cache(
  async (
    locale: Locale,
    workspace: string,
    slug: string
  ): Promise<Repository | null> => {
    return safeFetch('fetchRepositoryMeta', async () => {
      const core = await getServerCore(locale);
      const res = await core.repositoryService.fetchRepository({
        workspace,
        slug,
      });
      return res.data ?? null;
    });
  }
);

/** Fetch a workflow by workspace + id. */
export const fetchWorkflowMeta = cache(
  async (
    locale: Locale,
    workspace: string,
    workflowID: string
  ): Promise<Workflow | null> => {
    return safeFetch('fetchWorkflowMeta', async () => {
      const core = await getServerCore(locale);
      const res = await core.workflowService.fetchWorkflow({
        workspace,
        workflowID,
      });
      return res.data ?? null;
    });
  }
);

/** Fetch a connection by workspace + id. */
export const fetchConnectionMeta = cache(
  async (
    locale: Locale,
    workspace: string,
    connectionID: string
  ): Promise<Connection | null> => {
    return safeFetch('fetchConnectionMeta', async () => {
      const core = await getServerCore(locale);
      const res = await core.connectionService.fetchConnection({
        workspace,
        connectionID,
      });
      return res.data ?? null;
    });
  }
);

/** Fetch a stored query by workspace + id. */
export const fetchQueryMeta = cache(
  async (
    locale: Locale,
    workspace: string,
    queryID: string
  ): Promise<StoredQuery | null> => {
    return safeFetch('fetchQueryMeta', async () => {
      const core = await getServerCore(locale);
      const res = await core.queryService.getStoredQuery({
        workspace,
        queryID,
      });
      return res.data ?? null;
    });
  }
);

/** Fetch an AI application by workspace + id. */
export const fetchAIApplicationMeta = cache(
  async (
    locale: Locale,
    workspace: string,
    aiApplicationId: string
  ): Promise<AIApplication | null> => {
    return safeFetch('fetchAIApplicationMeta', async () => {
      const core = await getServerCore(locale);
      const res = await core.aiApplicationService.getAIApplication({
        workspace,
        aiApplicationId,
      });
      return res.data ?? null;
    });
  }
);

/** Fetch a user by workspace + id. */
export const fetchUserMeta = cache(
  async (
    locale: Locale,
    workspace: string,
    user: string
  ): Promise<User | null> => {
    return safeFetch('fetchUserMeta', async () => {
      const core = await getServerCore(locale);
      const res = await core.userService.fetchUser({ workspace, user });
      return res.data ?? null;
    });
  }
);

/**
 * Build a human-readable display name for a {@link User}.
 *
 * Prefers "First Last" when at least one name field is present, otherwise
 * falls back to the email local part (strips anything after `@`).
 */
export function userDisplayName(user: User): string {
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  if (full.length > 0) return full;
  if (user.email) return user.email.split('@')[0];
  return user.id;
}
