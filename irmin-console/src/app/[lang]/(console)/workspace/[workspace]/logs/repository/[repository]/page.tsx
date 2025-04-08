import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getLogs } from '@/lib/actions/logs';
import { getRepository } from '@/lib/actions/repositories';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

import LogsSection from '@/components/logs/LogsSection';

/**
 * URL parameters for the Repository Logs layout
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param repository - The slug of the repository to show logs for
 */
export type RepositoryLogsLayoutParams = {
  lang: Locale;
  workspace: string;
  repository: string;
};

/**
 * SEO metadata for the Repository Logs layout
 */
export async function generateMetadata(props: {
  params: Promise<RepositoryLogsLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  const formattedRepository = params.repository.replace(/-/g, ' ');
  return {
    title: `Repository ${formattedRepository} logs | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Repository Logs page - showing all log events for the repository.
 */
export default async function RepositoryLogsPage(props: {
  params: Promise<RepositoryLogsLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;

  const token = await getToken();
  const [logs, repository, { dict }] = await Promise.all([
    getLogs({ workspace: currentWorkspace, token }), // TODO: Get logs specific to the repository
    getRepository({
      workspace: currentWorkspace,
      repositorySlug: params.repository,
      token,
    }),
    initDict(),
  ]);

  if (!repository.data) return notFound();

  return (
    <LogsSection
      repository={repository.data}
      logEvents={logs.data ?? []}
      title={dict.logs.repositoryLogs}
    />
  );
}
