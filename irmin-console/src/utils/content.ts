import { isBlobText } from '@/utils/isBlobText';
import removeCircularJSON from '@/utils/removeCircularJSON';

import { IrminAPIUnstructuredResponse } from '@/types/core/IrminAPIResponse';

/**
 * Convert any type of content to text
 *
 * @param content - The content to convert
 *
 * @returns The content as text or null if impossible
 */
export const convertToText = (content: IrminAPIUnstructuredResponse) => {
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
export const getContentType = (content: IrminAPIUnstructuredResponse) => {
  if (content instanceof Blob) return content.type;
  if (typeof content === 'string') return 'text/plain';
  if (typeof content === 'number') return 'text/plain';
  if (typeof content === 'boolean') return 'text/plain';
  if (typeof content === 'object' && !(content instanceof Blob))
    return 'application/json';
  return 'text/plain';
};

/**
 * Construct a file name for the content based on the content type
 *
 * @param content - The content to construct the file name for
 * @param prefix - The prefix to add to the file name
 */
export const constructFileNameForContent = (
  content: IrminAPIUnstructuredResponse,
  prefix?: string
) => {
  const contentType = getContentType(content);
  const timestamp = Date.now();
  const name = prefix ? `${prefix}_${timestamp}` : timestamp;
  if (content instanceof Blob) {
    return `${name}.${contentType.split('/')[1]}`;
  }
  if (contentType === 'application/json') return `${name}.json`;
  if (contentType === 'text/plain') return `${name}.txt`;
  return `${name}.txt`;
};

/**
 * Download the content as a file with the given content type
 *
 * @param content - The content to download
 * @param contentType - The content type of the content
 * @param prefix - The prefix to add to the file name
 */
export const downloadContent = (
  content: Blob | string,
  contentType: string,
  prefix?: string
) => {
  try {
    const fileName = constructFileNameForContent(content, prefix);
    let url;
    if (content instanceof Blob) {
      url = URL.createObjectURL(content);
    } else {
      const blob = new Blob([content], { type: contentType });
      url = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading content:', error);
  }
};
