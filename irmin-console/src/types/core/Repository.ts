import { User } from '@/types/core/User';

/**
 * Repository object
 */
export interface Repository {
  /** Repository ID */
  id: string;
  /** Name of the Repository */
  name: string;
  /** Slug of the Repository. Used by App router and to parse Queries */
  slug: string;
  /** Short description of the Repository */
  description: string;
  /** Markdown documentation of the Repository. Allows for users to add explanations, examples, etc. */
  documentation: string;
  /** If the Repository is immutable, it cannot be changed or updated */
  is_immutable: boolean;
  /** Default branch of the Repository */
  default_branch: string;
  /** The user within the workspace that owns the Repository and is responsible for it */
  owner: User;
  /** Timestamp of the creation of the Repository */
  created_at: string;
  /** Timestamp of the last update of the Repository */
  updated_at: string;
}
