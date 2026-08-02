/**
 * Convert nanoseconds to whole milliseconds.
 * @param ns - duration in nanoseconds
 * @returns duration in milliseconds (integer)
 */
export function nsDurationToMs(ns: number): number {
  return Math.floor(ns / 1e6);
}
