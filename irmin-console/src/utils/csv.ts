/**
 * Converts an array of objects to a CSV string.
 * @param array - The array of objects to convert.
 * @returns The CSV string representation of the array.
 */
function convertArrayOfObjectsToCSV<T extends Record<string, unknown>>(
  array: T[]
): string {
  if (array.length === 0) return '';

  const columnDelimiter = ',';
  const lineDelimiter = '\n';
  const keys = Object.keys(array[0]);

  let result = '';
  result += keys.join(columnDelimiter);
  result += lineDelimiter;

  array.forEach((item) => {
    let ctr = 0;
    keys.forEach((key) => {
      if (ctr > 0) result += columnDelimiter;

      result += item[key];

      ctr++;
    });
    result += lineDelimiter;
  });

  return result;
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
  const link = document.createElement('a');
  let csv = convertArrayOfObjectsToCSV(array);
  if (csv === '') return;

  const slugifiedName = name.toLowerCase().replace(/\s+/g, '-');
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${slugifiedName}_${timestamp}.csv`;

  if (!csv.match(/^data:text\/csv/i)) {
    csv = `data:text/csv;charset=utf-8,${csv}`;
  }

  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', filename);
  link.click();
}
