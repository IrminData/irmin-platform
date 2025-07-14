import type { Connection } from '@/types/core/Connection';
import type { Invite } from '@/types/core/Invite';
import type { Object } from '@/types/core/Object';
import type { Repository } from '@/types/core/Repository';
import type { StoredQuery } from '@/types/core/StoredQuery';
import type { User } from '@/types/core/User';
import type { Workflow } from '@/types/core/Workflow';

/**
 * Represents a unified search result with typed entity data.
 */
export interface SearchResult {
  /** Type of the search result entity */
  type: string;
  /** Relevance score of the search result */
  relevance: number;

  // Typed entity fields - only one will be populated based on Type
  repository?: Repository;
  repository_object?: Object;
  workflow?: Workflow;
  connection?: Connection;
  query?: StoredQuery;
  user?: User;
  invite?: Invite;
}

/**
 * Represents the search filter options.
 */
export interface SearchFilters {
  /** Search query string */
  query?: string;
  /** Array of entity types to filter by */
  types?: string[];
  /** Array of tags to filter by */
  tags?: string[];
  /** Owner ID to filter by */
  owner_id?: string;
  /** Date from filter (ISO string) */
  date_from?: string;
  /** Date to filter (ISO string) */
  date_to?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip for pagination */
  offset?: number;
}

/**
 * Represents the search API response.
 */
export interface SearchResponse {
  /** Array of search results */
  results: SearchResult[];
  /** Total number of results */
  total: number;
  /** The search query that was executed */
  query: string;
  /** The filters that were applied */
  filters: SearchFilters;
}
