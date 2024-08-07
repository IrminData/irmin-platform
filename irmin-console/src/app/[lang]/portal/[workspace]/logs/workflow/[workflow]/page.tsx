import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow logs page
 *
 * @todo Implement this page and UI
 */
export default function WorkflowLogsPage({
  params,
}: Readonly<{
  params: WorkflowLogsLayoutParams;
}>) {
  return (
    <div className='w-full gap-2 p-4 py-8 text-center'>
      <h1 className='text-xl'>
        Workflow logs for ID: {params.workflow ?? 'no workflow'}
      </h1>
      <p className='text-sm'>One day there will be logs here...</p>
    </div>
  );
}
