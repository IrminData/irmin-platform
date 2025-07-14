import type { Duration } from 'date-fns';

/**
 * Format a duration for display in the UI.
 *
 * @param duration - The duration to format
 *
 * @returns The formatted duration string
 */
export const formatDurationForUI = (duration: Duration) => {
  const units = [
    { value: duration.days, label: 'd' },
    { value: duration.hours, label: 'h' },
    { value: duration.minutes, label: 'm' },
    { value: duration.seconds, label: 's' },
  ];

  const nonZeroUnits = units.filter((unit) => unit?.value ?? 0 > 0);
  const formattedUnits = nonZeroUnits
    .slice(0, 2)
    .map((unit) => `${Math.abs(unit.value ?? 0)}${unit.label}`);

  return formattedUnits.join(' ');
};
