/**
 * Type for JSON-compatible values
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONArray
  | JSONObject;

/**
 * Type for JSON-compatible objects
 */
export interface JSONObject {
  [key: string]: JSONValue;
}

/**
 * Type for JSON-compatible arrays
 */
export type JSONArray = JSONValue[];
