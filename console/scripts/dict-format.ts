/** Serialize a dictionary value as a JavaScript string literal. */
export function serializeDictionaryValue(value: string): string {
  return JSON.stringify(value);
}
