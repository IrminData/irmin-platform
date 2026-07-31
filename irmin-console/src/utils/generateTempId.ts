/**
 * Prefix every temporary ID starts with.
 *
 * Shared with `isTempId` so the optimistic-create path and the
 * fetch-gate path can't drift.
 */
const TEMP_ID_PREFIX = 'temp-';

/**
 * Generates a temporary ID with timestamp and random string.
 * Format: `temp-{type?}-{timestamp}-{random7chars}`.
 *
 * Temp IDs are used by optimistic-create mutations so the new item
 * can appear in the list cache before the server returns the real
 * SQID. Use {@link isTempId} to recognize them at fetch sites — a
 * single-item hook should never actually GET `/resource/{tempId}`
 * because the backend can't decode it as a SQID.
 *
 * @param type Optional type identifier to include in the ID
 *   (e.g., 'policy', 'workflow', 'connection').
 * @returns A unique temporary ID string.
 */
export function generateTempId(type?: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);

  if (type) {
    return `${TEMP_ID_PREFIX}${type}-${timestamp}-${randomString}`;
  }

  return `${TEMP_ID_PREFIX}${timestamp}-${randomString}`;
}

/**
 * Reports whether an ID was produced by {@link generateTempId} — i.e.,
 * a client-side placeholder for an optimistic-create row whose real
 * SQID hasn't come back from the server yet.
 *
 * Fetch-by-id hooks (`useConnection`, `useRepository`, `useWorkflow`,
 * …) use this to gate their TanStack Query `enabled` flag. Without
 * the gate, navigating to the detail page of a just-created item
 * fires `GET /resource/temp-{type}-...`; the backend can't decode
 * that as a SQID and responds 404, flooding error tracking for a
 * transient condition that resolves itself once the real SQID
 * arrives.
 *
 * The list cache already holds the optimistic item at this id, so
 * skipping the fetch costs the user nothing — React Query's
 * `initialData` surfaces the placeholder until the mutation's
 * onSuccess reconciles it with the real row.
 *
 * Accepts undefined for ergonomics — most call sites pass a URL
 * param that may be missing in edge routes. undefined is treated as
 * "not a temp id" so the existing `!!id` guard continues to gate the
 * null case.
 *
 * @param id The candidate ID, typically a route parameter.
 * @returns true when the ID starts with the reserved temp prefix.
 */
export function isTempId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(TEMP_ID_PREFIX);
}
