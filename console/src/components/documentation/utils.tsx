import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

/**
 * Extracts a display-friendly owner summary from an owner object.
 */
export function ownerSummary(owner?: {
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
}) {
  if (!owner) return null;
  const name = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
  const company = owner.company ? ` (${owner.company})` : '';
  return {
    name: `${name}${company}`.trim(),
    email: owner.email ?? '',
  };
}

/**
 * Renders an array of tags (strings or objects with `name`) as a list of Badge components.
 */
export function renderTags(tags?: unknown[]): ReactNode | null {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const tagLabels = tags
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object' && 'name' in tag) {
        const value = (tag as { name?: string }).name;
        return typeof value === 'string' ? value : null;
      }
      return null;
    })
    .filter((tag): tag is string => Boolean(tag));

  if (tagLabels.length === 0) return null;

  return tagLabels.map((tag) => (
    <Badge key={tag} variant='outline' className='text-xs'>
      {tag}
    </Badge>
  ));
}
