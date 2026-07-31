/**
 * Check if a blob is usable as text
 */
export const isBlobText = (blob: Blob) =>
  blob.type.startsWith('text/') ||
  blob.type === 'application/json' ||
  blob.type === 'application/xml' ||
  blob.type === 'application/javascript' ||
  blob.type === 'application/typescript' ||
  blob.type === 'application/html' ||
  blob.type === 'application/css' ||
  blob.type === 'application/markdown' ||
  blob.type === 'application/yaml';
