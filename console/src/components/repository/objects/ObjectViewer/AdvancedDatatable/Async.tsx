'use client';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Async wrapper for AdvancedDatatable that lazy-loads AG Grid.
 * AG Grid is ~500KB and only needed when viewing tabular data.
 */
const AdvancedDatatableAsync = dynamic(() => import('./index'), {
  loading: () => (
    <div className='size-full'>
      <LoadingSkeleton className='h-96' />
    </div>
  ),
  ssr: false, // AG Grid doesn't support SSR
});

export default AdvancedDatatableAsync;
