/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Remove circular references from JSON object
 *
 * Make sure the target is an object.
 * Clone the target object to avoid modifying the original object.
 * Recursively remove circular references while preserving valid falsy values.
 *
 * @param target - JSON object to remove circular references from
 *
 * @returns JSON object without circular references
 */
export default function removeCircularJSON(target: any) {
  // Make sure the target is an object
  if (!target || typeof target !== 'object') {
    return target;
  }

  // Use WeakMap for better performance and automatic garbage collection
  const seen = new WeakMap<object, any>();

  const recurse = (obj: any): any => {
    // Handle non-objects
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    // Check for circular reference
    if (seen.has(obj)) {
      return '[Circular Reference]'; // Replace with a string marker instead of deleting
    }

    // Mark as visited
    seen.set(obj, true);

    // Handle arrays
    if (Array.isArray(obj)) {
      const result = obj.map((item) => recurse(item));
      return result;
    }

    // Handle objects
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = recurse(obj[key]);
      }
    }

    return result;
  };

  return recurse(target);
}
