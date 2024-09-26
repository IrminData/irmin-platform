/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Remove circular references from JSON object
 *
 * Make sure the target is an object.
 * Clone the target object to avoid modifying the original object.
 * Recursively remove falsy elements and circular references.
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

  // Clone the target object to avoid modifying the original object
  const obj = Array.isArray(target)
    ? [...target].filter(Boolean)
    : { ...target };

  // Recursively remove circular references and falsy elements
  const seen = new Map<any, any>();
  const recurse = (obj: any) => {
    seen.set(obj, true);
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v !== 'object' || v === null) continue;
      if (seen.has(v)) delete obj[k];
      else {
        if (!v) delete obj[k];
        else recurse(v);
      }
    }
  };
  recurse(obj);

  return obj;
}
