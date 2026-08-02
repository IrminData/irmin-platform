'use client';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Async wrapper for TextDiff that lazy-loads react-diff-viewer.
 * react-diff-viewer is ~100KB and only needed when viewing diffs.
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
