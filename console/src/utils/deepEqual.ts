/**
 * Deeply compare two objects
 *
 * Similar to lodash's isEqual function, but without the extra features
 *
 * @param a - The first value to compare
 * @param b - The second value to compare
 */
export default function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a !== 'object' || a === null || b === null) {
    // Handle NaN comparison (NaN !== NaN in JavaScript)
    if (typeof a === 'number' && typeof b === 'number') {
      return Number.isNaN(a) && Number.isNaN(b);
    }
    // Handles cases where a and b are primitives or one is null
    return false;
  }

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle RegExp objects
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Handle different object types (Date vs Object, etc.)
  if (a.constructor !== (b as Record<string, unknown>).constructor) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    // Compare arrays
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    // One is array and one is not
    return false;
  }

  // Compare objects
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) {
      return false;
    }
    if (
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }

  return true;
}
