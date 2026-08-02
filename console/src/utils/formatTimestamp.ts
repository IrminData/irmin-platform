// Helper function to format timestamps safely
export const formatTimestamp = (
  timestamp: string | null | undefined,
  locale?: string
): string => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(locale);
  } catch {
    return '';
  }
};

/**
 * Format a timestamp as relative time (e.g., "2 hours ago", "yesterday")
 */
export const formatRelativeTime = (
  timestamp: string | null | undefined,
  locale?: string
): string => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Use Intl.RelativeTimeFormat for localized relative time
    const rtf = new Intl.RelativeTimeFormat(locale || 'en', {
      numeric: 'auto',
    });

    if (diffSecs < 60) {
      return rtf.format(-diffSecs, 'second');
    } else if (diffMins < 60) {
      return rtf.format(-diffMins, 'minute');
    } else if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    } else if (diffDays < 7) {
      return rtf.format(-diffDays, 'day');
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return rtf.format(-weeks, 'week');
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return rtf.format(-months, 'month');
    } else {
      const years = Math.floor(diffDays / 365);
      return rtf.format(-years, 'year');
    }
  } catch {
    return '';
  }
};
