/**
 * Generates a temporary ID with timestamp and random string
 * Format: temp-{type?}-{timestamp}-{random7chars}
 * @param type Optional type identifier to include in the ID (e.g., 'policy', 'workflow', 'connection')
 * @returns A unique temporary ID string
 */
export function generateTempId(type?: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);

  if (type) {
    return `temp-${type}-${timestamp}-${randomString}`;
  }

  return `temp-${timestamp}-${randomString}`;
}
