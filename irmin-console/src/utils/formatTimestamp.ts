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
