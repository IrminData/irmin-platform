import { Role } from '@/types/core/IrminRole';

/**
 * Represents a user.
 */
export interface User {
  /** Unique identifier of the user */
  id: string;
  /** First name of the user */
  first_name: string;
  /** Last name of the user */
  last_name: string;
  /** Email address of the user */
  email: string;
  /** Phone number of the user */
  phone: string;
  /** Company associated with the user */
  company: string;
  /** URL of the user's profile picture */
  profile_picture: string;
  /** (optional) Roles assigned to the user */
  roles?: Role[];
}
