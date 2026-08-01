/**
Format file size in a human-readable format

@param bytes - size in bytes
@returns formatted size string (e.g. "1.5 KB")
*/

export function formatFileSizeForUI(bytes?: number): string {
  if (bytes === undefined) return '-';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
