/**
 * Generates a random date-time string within a specified range of days in the past or future,
 * with an optional offset in days.
 *
 * @param {number} daysRange - The range of days within which to generate the random date.
 * @param {'past' | 'future'} direction - Specifies whether the date should be in the past or future.
 * @param {number} [offsetDays=0] - An optional offset in days to add to the generated date.
 * @returns {string} - A random date-time string in ISO format. eg. '2025-08-25T14:15:00.000Z'
 *
 * @example
 * // Get a random date-time string within the last 30 days
 * const pastDate = getRandomDateTimeString(30, 'past');
 *
 * // Get a random date-time string within the next 30 days
 * const futureDate = getRandomDateTimeString(30, 'future');
 *
 * // Get a random date-time string within the next 30 days with an offset of 5 days
 * const futureDateWithOffset = getRandomDateTimeString(30, 'future', 5);
 */
export function getRandomDateTimeString(
  daysRange: number,
  direction: 'past' | 'future',
  offsetDays: number = 0
): string {
  const currentDate = new Date();
  const randomDays = Math.floor(Math.random() * daysRange);
  const totalDays =
    direction === 'past' ? randomDays + offsetDays : randomDays - offsetDays;
  const adjustedDate =
    direction === 'past'
      ? new Date(currentDate.setDate(currentDate.getDate() - totalDays))
      : new Date(currentDate.setDate(currentDate.getDate() + totalDays));
  return adjustedDate.toISOString();
}
