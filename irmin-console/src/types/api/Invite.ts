import { IrminRole } from '@/types/api/IrminRole';

/**
 * Invite type
 * @typeParam id - Invite ID
 * @typeParam name - Invite name
 * @typeParam email - Invite email
 * @typeParam created_at - Invite creation date
 * @typeParam updated_at - Invite update date
 * @typeParam role - Invite role
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface Invite {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  role: IrminRole;
}
