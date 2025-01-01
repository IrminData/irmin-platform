/**
 * Irmin system token type
 */
export interface SystemToken {
  /** Unique identifier of the token */
  id: string;
  /** Device identifier provided during creation */
  name: string;
  /** Timestamp of when the token expires */
  expiry: string;
  /** (optional) The token. Only provided on creation */
  token?: string;
}
