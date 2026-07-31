import type { ConnectionFieldValues } from '@/types/core/Connection';
import type { DynamicFieldValues } from '@/types/internal/DynamicField';

/**
 * Converts DynamicFieldValues to ConnectionFieldValues by converting all values to strings.
 * Handles boolean, number, string, undefined, and array values.
 *
 * @param dynamicValues - The dynamic field values to convert
 * @returns ConnectionFieldValues with all values converted to strings
 */
export function convertToConnectionFieldValues(
  dynamicValues?: DynamicFieldValues
): ConnectionFieldValues {
  const connectionValues: ConnectionFieldValues = {};

  for (const [key, value] of Object.entries(dynamicValues ?? {})) {
    if (value === undefined) {
      connectionValues[key] = '';
    } else if (Array.isArray(value)) {
      // Convert array values to comma-separated string
      connectionValues[key] = value
        .map((item) => (item === undefined ? '' : String(item)))
        .join(',');
    } else {
      // Convert single values to string
      connectionValues[key] = String(value);
    }
  }

  return connectionValues;
}
