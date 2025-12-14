import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  repositoryObjectHistoryQueryKey,
  repositoryObjectQueryKey,
  repositoryObjectSchemaQueryKey,
  repositoryUncommittedChangesQueryKey,
} from '@/lib/queryKeys';

import { useWorkspaceContext } from '@/context/WorkspaceContext';

/**
 * Get the parent directory path from a file/directory path
 * @param path - The file or directory path
 * @returns The parent directory path, or empty string if at root
 */
const getParentDirectoryPath = (path: string): string => {
  if (!path || path === '/' || path === '') return '';

  // Normalize path by removing trailing slashes
  const normalizedPath = path.replace(/\/+$/, '');

  // Find the last slash to get the parent directory
  const lastSlashIndex = normalizedPath.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    // No slash found, parent is root
    return '';
  }

  if (lastSlashIndex === 0) {
    // Slash at beginning, parent is root
    return '';
  }

  // Return everything before the last slash
  return normalizedPath.substring(0, lastSlashIndex);
};

/**
 * Hook to invalidate object-related queries when an object is uploaded, deleted, moved, or renamed
 *
 * @param repositorySlug - The repository slug
 * @returns The invalidateObjectQueries function
 */
export const useInvalidateObjectQueries = (repositorySlug: string) => {
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  // Helper function to invalidate object-related queries for a specific path
  const invalidateObjectQueriesForPath = useCallback(
    (path: string, ref: string) => {
      // Invalidate the query for the specific object
      void queryClient.invalidateQueries({
        queryKey: repositoryObjectQueryKey(
          workspaceSlug,
          repositorySlug,
          ref,
          path
        ),
      });
      // Invalidate the query for the object's content
      // Use predicate to match all queries regardless of limitResponse parameter
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            queryKey[0] === 'repository-object-content' &&
            queryKey[1] === workspaceSlug &&
            queryKey[2] === repositorySlug &&
            queryKey[3] === ref &&
            queryKey[4] === path
          );
        },
      });
      // Invalidate the query for the object's schema
      void queryClient.invalidateQueries({
        queryKey: repositoryObjectSchemaQueryKey(
          workspaceSlug,
          repositorySlug,
          ref,
          path
        ),
      });
      // Invalidate the query for the object's history
      void queryClient.invalidateQueries({
        queryKey: repositoryObjectHistoryQueryKey(
          workspaceSlug,
          repositorySlug,
          ref,
          path
        ),
      });
    },
    [queryClient, workspaceSlug, repositorySlug]
  );

  // Main function to invalidate object-related queries
  const invalidateObjectQueries = useCallback(
    (path: string, ref: string) => {
      // Always invalidate the specific object
      invalidateObjectQueriesForPath(path, ref);

      // Get the parent directory and invalidate it too
      const parentPath = getParentDirectoryPath(path);
      if (parentPath !== path) {
        // Invalidate parent directory to refresh directory listings
        invalidateObjectQueriesForPath(parentPath, ref);
      }

      // Always invalidate root directory queries to ensure repository-level
      // views stay up to date (this is what ObjectList uses as the base data)
      invalidateObjectQueriesForPath('', ref);

      // Object operations (upload, delete, move, copy) create uncommitted changes
      // so we need to invalidate the uncommitted changes query to reflect this in the UI
      void queryClient.invalidateQueries({
        queryKey: repositoryUncommittedChangesQueryKey(
          workspaceSlug,
          repositorySlug,
          ref
        ),
      });
    },
    [invalidateObjectQueriesForPath, queryClient, workspaceSlug, repositorySlug]
  );

  return {
    invalidateObjectQueries,
    invalidateObjectQueriesForPath,
  };
};
