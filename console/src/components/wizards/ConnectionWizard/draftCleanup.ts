/**
 * Determines whether OAuth draft cleanup should delete the draft connection.
 *
 * A successful OAuth handshake does not commit the draft; the draft is only
 * committed after the final configuration submit succeeds.
 *
 * @param draftID - The draft connection identifier to clean up.
 * @param draftCommitted - Whether final submit has committed the draft.
 * @returns True when cleanup should delete the draft connection.
 */
export function shouldDeleteOAuthDraft(
  draftID: string | null | undefined,
  draftCommitted: boolean
): draftID is string {
  return !!draftID && !draftCommitted;
}
