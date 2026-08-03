/**
 * Type for JSON-compatible values
 */
export type JSONValue =
  JSONArray | JSONObject | boolean | number | string | null;

/**
 * Type for JSON-compatible objects
 */
interface JSONObject {
  [key: string]: JSONValue;
}

/**
 * Type for JSON-compatible arrays
 */
type JSONArray = JSONValue[];
