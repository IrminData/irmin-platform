import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

import { WorkspaceLayoutParams } from '../layout';

/**
 * Workspace Audit Logs page
 */
export default async function LogsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const { dict } = await initDict();
  return (
    <LogsSection
      logsForType='workspace'
      logsFor={currentWorkspace}
      title={dict.logs.workspaceLogs}
    />
  );
}
