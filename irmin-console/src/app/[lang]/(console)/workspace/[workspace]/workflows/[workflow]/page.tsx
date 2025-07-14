import WorkflowSection from '@/components/workflow/WorkflowSection';

import type { SingleWorkflowLayoutParams } from './layout';

/**
 * Single workflow page
 */
export default async function WorkflowPage(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<SingleWorkflowLayoutParams>;
  }>
) {
  const params = await props.params;
  const { workflow } = params;

  return <WorkflowSection workflowID={workflow} />;
}
