import { IrminRole } from '@/types/api/IrminRole';

/**
 * Invite type
 *
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
 *
 * @typeParam id - Invite ID
 * @typeParam name - Invite name
 * @typeParam email - Invite email
 * @typeParam created_at - Invite creation date
 * @typeParam updated_at - Invite update date
 * @typeParam role - Invite role
 */
export interface Invite {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  role: IrminRole;
}
