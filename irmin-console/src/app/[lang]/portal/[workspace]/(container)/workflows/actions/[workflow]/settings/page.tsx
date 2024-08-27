import { ActionWorkflowLayoutParams } from '../layout';

/**
 * Action Workflow Settings page
 *
 * @todo Implement this page and UI
 */
export default function ActionWorkflowSettings({
  params,
}: {
  params: ActionWorkflowLayoutParams;
}) {
  return (
    <div className='w-full gap-2 p-4 py-8 text-center'>
      <h1 className='font-display text-xl'>
        Settings for Action Workflow: {params.workflow ?? 'unknown'}
      </h1>
      <p className='text-sm'>One day there will something beautiful here...</p>
    </div>
  );
}
