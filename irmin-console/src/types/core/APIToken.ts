/**
 * Irmin system token type
 */
export interface APIToken {
  /** Unique identifier of the token */
  id: string;
  /** When was the token created */
  created_at: string;
  /** When was the token last updated */
  updated_at: string;
  /** Descriptive name of the token */
  name: string;
  /** (optional) The token. Only provided on creation */
  token?: string;
  /** Time when the token expires */
  expiry: string;
}
