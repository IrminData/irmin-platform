import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function BillingLoading() {
  return (
    <div className='container mx-auto max-w-4xl px-4 py-8'>
      <div className='mb-6 flex flex-col gap-2'>
        <LoadingSkeleton className='h-8 w-48' />
        <LoadingSkeleton className='h-4 w-96 max-w-full' />
      </div>
      {/* Plan card */}
      <div className='mb-6 rounded-lg border border-border bg-card p-6'>
        <div className='mb-4 flex items-center justify-between'>
          <LoadingSkeleton className='h-6 w-32' />
          <LoadingSkeleton className='h-10 w-40 rounded-md' />
        </div>
        <LoadingSkeleton className='mb-2 h-4 w-2/3' />
        <LoadingSkeleton className='h-4 w-1/2' />
      </div>
      {/* Usage */}
      <div className='mb-6 rounded-lg border border-border bg-card p-6'>
        <LoadingSkeleton className='mb-4 h-6 w-24' />
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`usage-${i}`}>
              <div className='mb-1 flex items-center justify-between'>
                <LoadingSkeleton className='h-4 w-32' />
                <LoadingSkeleton className='h-4 w-16' />
              </div>
              <LoadingSkeleton className='h-2 w-full rounded-full' />
            </div>
          ))}
        </div>
      </div>
      {/* Invoices */}
      <div className='rounded-lg border border-border bg-card p-6'>
        <LoadingSkeleton className='mb-4 h-6 w-24' />
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`inv-${i}`}
              className='
                flex items-center justify-between border-b border-border py-3
                last:border-b-0
              '
            >
              <LoadingSkeleton className='h-4 w-24' />
              <LoadingSkeleton className='h-4 w-20' />
              <LoadingSkeleton className='h-8 w-20 rounded-md' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
