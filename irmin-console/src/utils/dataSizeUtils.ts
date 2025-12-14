import type { JSONValue } from '@/types/internal/GenericJSON';

export const MAX_SAFE_JSON_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_SAFE_BLOB_SIZE = 50 * 1024 * 1024; // 50 MB

const MAX_SAFE_TABLE_ROWS = 10000; // Warning threshold
const MAX_HARD_LIMIT_TABLE_ROWS = 100000; // Hard block threshold

/**
 * Estimate the size of a JavaScript object in bytes
 *
 * @param data - The data to estimate size for
 * @returns Estimated size in bytes
 */
export const estimateDataSize = (data: unknown): number => {
  const objectList = new Set();
  const stack = [data];
  let bytes = 0;

  while (stack.length > 0) {
    const value = stack.pop();

    if (value === null || value === undefined) {
      bytes += 4;
      continue;
    }

    switch (typeof value) {
      case 'boolean':
        bytes += 4;
        break;
      case 'number':
        bytes += 8;
        break;
      case 'string':
        bytes += value.length * 2;
        break;
      case 'object':
        if (objectList.has(value)) {
          continue;
        }
        objectList.add(value);

        if (Array.isArray(value)) {
          bytes += value.length * 8;
          value.forEach((item) => stack.push(item));
        } else if (value instanceof Blob) {
          bytes += value.size;
        } else {
          const keys = Object.keys(value);
          bytes += keys.length * 8;
          keys.forEach((key) => {
            bytes += key.length * 2;
            stack.push((value as Record<string, unknown>)[key]);
          });
        }
        break;
      default:
        bytes += 8;
    }
  }

  return bytes;
};

/**
 * Check if JSON data can be safely rendered
 *
 * @param data - The JSON data to check
 * @returns True if safe to render, false otherwise
 */
export const canSafelyRenderJSON = (data: JSONValue): boolean => {
  const size = estimateDataSize(data);
  return size <= MAX_SAFE_JSON_SIZE;
};

/**
 * Check if table data can be safely rendered
 *
 * @param rows - The table rows to check
 * @returns Object with safe and hardLimit flags
 */
export const canSafelyRenderTable = (
  rows: unknown[]
): { safe: boolean; hardLimit: boolean } => {
  if (!Array.isArray(rows)) {
    return { safe: true, hardLimit: false };
  }

  const rowCount = rows.length;
  return {
    safe: rowCount <= MAX_SAFE_TABLE_ROWS,
    hardLimit: rowCount > MAX_HARD_LIMIT_TABLE_ROWS,
  };
};

/**
 * Format bytes into human-readable string
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "45.2 MB")
 */
export const formatByteSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Clamp index to valid array bounds
  const safeIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2))} ${sizes[safeIndex]}`;
};

/**
 * Format row count into human-readable string
 *
 * @param count - Number of rows
 * @returns Formatted string (e.g., "10,000 rows")
 */
export const formatRowCount = (count: number): string => {
  return `${count.toLocaleString()} ${count === 1 ? 'row' : 'rows'}`;
};
