/**
 * Typed errors thrown by the Irmin core client. These let UI layers
 * react to specific failure modes (e.g., "the file is too big to
 * preview — render the download CTA") instead of pattern-matching on
 * error message strings, which was the old approach and drifted every
 * time the backend reworded its payload.
 *
 * Keep this file small. Only add error classes here when the UI
 * genuinely needs to distinguish them from "some request failed."
 */

/**
 * Payload shape the backend returns on a 413 when a repository
 * object exceeds the inline-preview size limit. Mirrors
 * `writeContentTooLargeResponse` in `controllers/repository-objects.go`.
 *
 * `code` is the discriminator. When present and equal to
 * `content_too_large`, the response is the structured 413 and the
 * rest of the fields are defined.
 *
 * Exported for consumers that want to parse the payload independently
 * of the ContentTooLargeError throw path (e.g., a hypothetical future
 * non-throwing branch of fetchBinary).
 */
// eslint-disable-next-line import-x/no-unused-modules
export interface ContentTooLargePayload {
  code: 'content_too_large';
  size_mb: number;
  max_size_mb: number;
  size_bytes: number;
  max_size_bytes: number;
  path: string;
  downloadable: boolean;
}

/**
 * Thrown by `IrminCore.fetchAPI` and `IrminCore.fetchBinary` when the
 * backend returns a structured `content_too_large` 413. Carries the
 * size metadata so the UI can render a proper "file too large, try
 * download" card instead of a generic error toast.
 *
 * The plain `Error.message` is human-readable and matches the old
 * behavior, so callers that don't inspect the typed fields still get
 * something reasonable to display.
 *
 * Test with `instanceof ContentTooLargeError` rather than
 * `.name === 'ContentTooLargeError'`. In TypeScript, the standard
 * Error constructor handles the prototype chain correctly when we
 * restore it via `Object.setPrototypeOf` in the constructor body —
 * which is the defensive fix for the legacy transpile target that
 * would otherwise lose the instanceof check.
 */
export class ContentTooLargeError extends Error {
  public readonly status = 413;
  public readonly code = 'content_too_large' as const;
  public readonly sizeMB: number;
  public readonly maxSizeMB: number;
  public readonly sizeBytes: number;
  public readonly maxSizeBytes: number;
  public readonly path: string;
  public readonly downloadable: boolean;

  constructor(message: string, payload: ContentTooLargePayload) {
    super(message);
    this.name = 'ContentTooLargeError';
    this.sizeMB = payload.size_mb;
    this.maxSizeMB = payload.max_size_mb;
    this.sizeBytes = payload.size_bytes;
    this.maxSizeBytes = payload.max_size_bytes;
    this.path = payload.path;
    this.downloadable = payload.downloadable;
    // Restore prototype so `instanceof` works when transpiled to
    // legacy targets — standard TypeScript workaround for extending
    // built-in classes.
    Object.setPrototypeOf(this, ContentTooLargeError.prototype);
  }
}

/**
 * Type guard that narrows an unknown value to a
 * `ContentTooLargePayload` when the backend's 413 body shape matches.
 * Used inside the fetch wrappers to decide whether to throw a rich
 * `ContentTooLargeError` or fall back to the generic error path.
 */
export function isContentTooLargePayload(
  body: unknown
): body is ContentTooLargePayload {
  if (typeof body !== 'object' || body === null) return false;
  const record = body as Record<string, unknown>;
  return (
    record.code === 'content_too_large' &&
    typeof record.size_mb === 'number' &&
    typeof record.max_size_mb === 'number' &&
    typeof record.size_bytes === 'number' &&
    typeof record.max_size_bytes === 'number' &&
    typeof record.path === 'string' &&
    typeof record.downloadable === 'boolean'
  );
}
