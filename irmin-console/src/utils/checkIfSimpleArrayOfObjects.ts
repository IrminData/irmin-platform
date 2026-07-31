import type { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Check if the data is a simple array of objects.
 * A simple array of objects is an array where each item is an object with no nested objects.
 *
 * This is useful for checking if a JSON array can be displayed in a table.
 *
 * @param data - The data to check
 * @returns Whether the data is a simple array of objects
 */
export const checkIfSimpleArrayOfObjects = (data: JSONValue) => {
  const isSimpleArrayOfObjects =
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        Object.values(item).every(
          (value) => typeof value !== 'object' || value === null
        )
    );
  return isSimpleArrayOfObjects;
};
