import { notFound } from 'next/navigation';

import { getRepository } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

import { RepositoryLogsLayoutParams } from './layout';

/**
 * Repository Audit Logs page
 */
export default async function RepositoryLogsPage(props: {
  params: Promise<RepositoryLogsLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const repositorySlug = params.repository;

  const token = await getToken();
  const [repository, { dict }] = await Promise.all([
    getRepository({
      workspace: currentWorkspace,
      repositorySlug,
      token,
    }),
    initDict(),
  ]);

  if (!repository.data) return notFound();
  return (
    <LogsSection
      repository={repository.data}
      logsForType='repository'
      logsFor={repositorySlug}
      title={dict.logs.repositoryLogs}
    />
  );
}
