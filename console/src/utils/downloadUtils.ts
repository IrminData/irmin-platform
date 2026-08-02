import { downloadFile } from './downloadFile';

/**
 * Download utilities for various file types
 */

/**
 * Generate filename with timestamp
 *
 * @param basename - The base filename (without extension)
 * @param extension - The file extension (without dot)
 * @returns Slugified filename with timestamp
 */
const generateTimestampedFilename = (
  basename: string,
  extension: string
): string => {
  const slugifiedName = basename.toLowerCase().replace(/\s+/g, '-');
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  return `${slugifiedName}_${timestamp}.${extension}`;
};

/**
 * Download data as a JSON file
 *
 * @param data - The data to download as JSON
 * @param filename - The base filename (without extension)
 */
export const downloadJSON = (data: unknown, filename: string): void => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const finalFilename = generateTimestampedFilename(filename, 'json');
    downloadFile(jsonString, finalFilename, 'application/json');
  } catch (error) {
    console.error('Error downloading JSON:', error);
  }
};

/**
 * Converts an array of objects to a CSV string with proper escaping.
 * @param array - The array of objects to convert.
 * @returns The CSV string representation of the array.
 */
function convertArrayOfObjectsToCSV<T extends Record<string, unknown>>(
  array: T[]
): string {
  if (array.length === 0) return '';

  const keys = Object.keys(array[0]);
  const lines: string[] = [];

  // Add header row
  lines.push(keys.join(','));

  // Add data rows
  array.forEach((item) => {
    const row = keys.map((key) => {
      const value = item[key];
      const stringValue = String(value ?? '');

      // Escape values that contain commas, quotes, or newlines
      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    });

    lines.push(row.join(','));
  });

  return lines.join('\n');
}

/**
 * Downloads a CSV file from an array of objects.
 * @param array - The array of objects to convert to CSV.
 * @param name - The name of the file to download.
 */
export function downloadCSV<T extends Record<string, unknown>>(
  array: T[],
  name: string
): void {
  const csv = convertArrayOfObjectsToCSV(array);
  if (csv === '') return;

  const finalFilename = generateTimestampedFilename(name, 'csv');
  downloadFile(csv, finalFilename, 'text/csv;charset=utf-8');
}
