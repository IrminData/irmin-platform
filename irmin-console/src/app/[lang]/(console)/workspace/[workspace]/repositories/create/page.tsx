import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import RepositoriesSection from '@/components/repository/RepositoriesSection';

import { WorkspaceLayoutParams } from '../../layout';

/**
 * Page to create a new Repository in the workspace
 *
 * Uses {@link RepositoriesSection} to provide UI for new Repository creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the repositories page.
 */
export default async function RepositoryCreatePage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const repositories = await getRepositories({
    workspace: params.workspace,
    token,
  });
  return (
    <RepositoriesSection
      repositories={repositories.data ?? []}
      sideModalOpen={true}
    />
  );
}
