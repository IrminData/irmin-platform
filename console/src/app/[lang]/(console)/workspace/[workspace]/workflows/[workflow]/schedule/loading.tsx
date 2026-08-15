import FormSkeleton from '@/components/ui/loading/FormSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function WorkflowScheduleLoading() {
  return (
    <div className='container mx-auto max-w-3xl px-4 py-6'>
      <FormSkeleton fieldCount={3} showTitle={false} showSubmit={false} />
      <LoadingSkeleton className='mt-6 h-24 w-full rounded-[2px]' />
      <div className='mt-6 flex justify-end gap-2'>
        <LoadingSkeleton className='h-10 w-24 rounded-[2px]' />
        <LoadingSkeleton className='h-10 w-28 rounded-[2px]' />
      </div>
    </div>
  );
}
