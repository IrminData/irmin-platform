/**
 * Returns a random element from the given array.
 */
export function getRandomArrayElement<T>(arr: T[]): T {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}
