/**
 * Create a new searchParams string by merging the current
 * searchParams with a provided key/value pair.
 *
 * @param name - The name of the query parameter
 * @param value - The value of the query parameter
 * @param searchParams - The current searchParams string
 * @returns The new searchParams string
 */
export const createQueryString = (
  name: string,
  value: string,
  searchParams: string
) => {
  const params = new URLSearchParams(searchParams);
  params.set(name, value);

  return params.toString();
};

/**
 * Delete a query parameter from a searchParams string.
 *
 * @param name - The name of the query parameter to delete
 * @param searchParams - The current searchParams string
 * @returns The new searchParams string
 */
export const deleteQueryParam = (name: string, searchParams: string) => {
  const params = new URLSearchParams(searchParams);
  params.delete(name);

  return params.toString();
};
