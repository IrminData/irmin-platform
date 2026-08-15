import type { Dictionary } from '@/lib/dict';

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

/** Format a numeric PDF value for the active locale. */
export function formatPDFNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Format a localized singular or plural count for PDF rendering. */
export function formatPDFCount(
  count: number,
  locale: string,
  singularTemplate: string,
  pluralTemplate: string
): string {
  const template = count === 1 ? singularTemplate : pluralTemplate;
  return template.replace('{count}', formatPDFNumber(count, locale));
}

/** Return the localized label for a workflow type. */
export function workflowTypeText(
  type: string | undefined,
  dict: Dictionary
): string {
  if (!type) return '';

  const labels: Record<string, string> = {
    import: dict.workflow.import,
    export: dict.workflow.export,
    action: dict.workflow.action,
    pipeline: dict.workflow.pipeline.pipeline,
  };

  return labels[type] ?? type;
}
