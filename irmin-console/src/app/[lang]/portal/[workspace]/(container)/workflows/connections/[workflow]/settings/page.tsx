import { ConnectionWorkflowLayoutParams } from '../layout';

/**
 * Connection Workflow Settings page
 *
 * @todo Implement this page and UI
 */
export default function ConnectionWorkflowSettings({
  params,
}: {
  params: ConnectionWorkflowLayoutParams;
}) {
  return (
    <div className='w-full gap-2 p-4 py-8 text-center'>
      <h1 className='font-display text-xl'>
        Settings for Connection Workflow: {params.workflow ?? 'unknown'}
      </h1>
      <p className='text-sm'>One day there will something beautiful here...</p>
    </div>
  );
}
