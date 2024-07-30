import { IrminRole } from '@/types/api/IrminRole';

/**
 * Workspace type
 * @typeParam id - Workspace ID
 * @typeParam name - Workspace name
 * @typeParam slug - Workspace slug
 * @typeParam owner_id - Workspace owner ID
 * @typeParam description - Workspace description to be displayed (optional)
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  description?: string;
}

/**
 * WorkspaceUser type
 * @typeParam id - User ID
 * @typeParam name - User name
 * @typeParam company - User company
 * @typeParam email - User email
 * @typeParam email_verified_at - User email verified at
 * @typeParam created_at - User creation date
 * @typeParam updated_at - User update date
 * @typeParam roles - Array of IrminRole
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface WorkspaceUser {
  id: number;
  name: string;
  company: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles?: IrminRole[];
}
