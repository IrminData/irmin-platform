'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import TagBadge from '@/components/ui/TagBadge';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import type { Tag } from '@/types/core/Tag';

interface WorkspaceTagDisplayProps {
  /** Array of tags to display */
  tags: Tag[];
  /** Maximum number of tags to show before truncating (default: 3) */
  maxVisible?: number;
  /** Size of the tag badges */
  size?: 'sm' | 'md';
  /** Whether tags should be clickable to navigate to tag details */
  clickable?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component to display repository tags in a compact format suitable for lists.
 * Shows a limited number of tags with a "+X more" indicator for overflow.
 *
 * @param props - The component props
 */
export function WorkspaceTagDisplay({
  tags,
  maxVisible = 3,
  size = 'sm',
  clickable = true,
  className = '',
}: WorkspaceTagDisplayProps) {
  const router = useRouter();

  const { isResourceAllowed } = useResourceAllowed();

  // Filter tags to only include tags that the user has permission to read
  const allowedTags = useMemo(() => {
    return tags.filter((tag) =>
      isResourceAllowed(PolicyResource.WorkspaceTag, PolicyAction.Read, tag.id)
    );
  }, [tags, isResourceAllowed]);

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const { visibleTags, remainingCount } = useMemo(() => {
    if (allowedTags.length <= maxVisible) {
      return { visibleTags: allowedTags, remainingCount: 0 };
    }
    return {
      visibleTags: allowedTags.slice(0, maxVisible),
      remainingCount: allowedTags.length - maxVisible,
    };
  }, [allowedTags, maxVisible]);

  const handleTagClick = (tag: Tag) => {
    if (clickable) {
      router.push(`${workspaceUrl}/settings/tags/${tag.id}`);
    }
  };

  if (allowedTags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          onClick={clickable ? () => handleTagClick(tag) : undefined}
        />
      ))}
      {remainingCount > 0 && (
        <span className='text-muted-foreground ml-1 text-xs'>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

export default WorkspaceTagDisplay;
