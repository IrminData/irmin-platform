/**
 * Irmin user profile type
 * @typeParam id - Profile ID
 * @typeParam name - Profile name
 * @typeParam company - Profile company
 * @typeParam email - Profile email
 * @typeParam email_verified_at - Profile email verified at
 * @typeParam created_at - Profile creation date
 * @typeParam updated_at - Profile update date
 * @example See `/src/types/examples/apiObjects.ts`.ts - find object referencing this type
 */
export interface Profile {
  id: number;
  name: string;
  company: string | null;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
