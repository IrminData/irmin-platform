/**
 * Format an owner object into a readable string for PDF rendering.
 */
export function ownerText(
  owner?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    company?: string;
  } | null
): string {
  if (!owner) return '';
  const name = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
  const parts = [
    name,
    owner.company ? `(${owner.company})` : '',
    owner.email ? `• ${owner.email}` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Format a tags array into a comma-separated string for PDF rendering.
 */
export function tagsText(tags?: { name?: string }[] | string[] | null): string {
  if (!tags || tags.length === 0) return '';
  return tags
    .map((t) => (typeof t === 'string' ? t : (t?.name ?? '')))
    .filter(Boolean)
    .join(', ');
}
