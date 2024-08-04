/**
 * Irmin user profile type
 *
 * Not to be confused with the WorkspaceUser type.
 * WorkspaceUser is used to represent a user in the context of a workspace - used to access workspace functionality.
 * Profile is used to represent a user's profile in the Irmin system - used for sign in etc.
 *
 * @see {@link https://github.com/IrminData/irmin-frontend/blob/development/src/types/examples/apiObjects.ts | examples/apiObjects.ts} - find object referencing this type to view example
 *
 * @typeParam id - Profile's ID
 * @typeParam name - Profile's name
 * @typeParam company - Profile's company
 * @typeParam email - Profile's email
 * @typeParam profile_picture - URL of profile picture (can be base64 encoded data URL)
 * @typeParam email_verified_at - Timestamp of email verification
 * @typeParam created_at - Timestamp of when the profile was created
 * @typeParam updated_at - Timestamp of when the profile was last updated
 */
export interface Profile {
  id: number;
  name: string;
  company?: string | null;
  email: string;
  profile_picture?: string | null;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}
