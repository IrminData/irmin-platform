import { initCore } from '@/lib/initCore';

import RepositoryDownloadSection from '@/components/repository/RepositoryDownloadSection';

import { RepositoryRouteParams } from '../layout';

/**
 * Page to download a repository or specific collections at a specific ref
 */
export default async function RepositoryDownloadPage(props: {
  params: Promise<RepositoryRouteParams>;
}) {
  const params = await props.params;

  const locale = params.lang;
  const workspaceSlug = params.workspace;
  const repositorySlug = params.repository;
  const irminCore = await initCore();

  return (
    <RepositoryDownloadSection
      irminCore={irminCore}
      workspaceSlug={workspaceSlug}
      repositorySlug={repositorySlug}
      locale={locale}
    />
  );
}
