'use client';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Async wrapper for TextDiff that lazy-loads react-diff-viewer-continued.
 * The diff viewer is only needed when viewing diffs.
 */
const TextDiffAsync = dynamic(() => import('./TextDiff'), {
  loading: () => (
    <div className='flex h-48 items-center justify-center'>
      <LoadingSkeleton className='size-full' />
    </div>
  ),
  ssr: false, // Avoid hydration issues with theme detection
});

export default TextDiffAsync;
