/**
 * Utility function to check if a route prop is invalid
 *
 * Used by layout components to check if a route prop is invalid before rendering
 */
export const isInvalidRouteProp = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === '' ||
  value === 'undefined';
