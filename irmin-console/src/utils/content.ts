import { isBlobText } from '@/utils/isBlobText';
import removeCircularJSON from '@/utils/removeCircularJSON';

import type { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

/**
 * Convert any type of content to text
 *
 * @param content - The content to convert
 *
 * @returns The content as text or null if impossible
 */
export const convertToText = (content: IrminAPIBinaryResponse) => {
  if (content instanceof Blob && isBlobText(content)) {
    const reader = new FileReader();
    reader.readAsText(content);
    if (reader.result) return reader.result.toString();
  }
  if (typeof content === 'string') return content;
  if (typeof content === 'number') return content.toString();
  if (typeof content === 'boolean') return content ? 'TRUE' : 'FALSE';
  if (typeof content === 'object' && !(content instanceof Blob))
    return JSON.stringify(removeCircularJSON(content), null, 2);
  return null;
};

/**
 * Get the content type of the content
 *
 * @param content - The content to get the content type for
 */
export const getContentType = (content: IrminAPIBinaryResponse) => {
  if (content instanceof Blob) return content.type;
  if (typeof content === 'string') return 'text/plain';
  if (typeof content === 'number') return 'text/plain';
  if (typeof content === 'boolean') return 'text/plain';
  if (typeof content === 'object' && !(content instanceof Blob))
    return 'application/json';
  return 'text/plain';
};
