import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import WorkflowScheduleSection from '@/components/workflow/WorkflowScheduleSection';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow schedule settings
 */
export default async function WorkflowSchedulePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const token = await getToken();
  const repositories = await getRepositories({
    workspace: params.workspace,
    token,
  });

  return (
    <WorkflowScheduleSection
      workflowID={params.workflow}
      repositories={repositories.data ?? []}
    />
  );
}
