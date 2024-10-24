import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import RepositoriesSection from '@/components/repository/RepositoriesSection';

/**
 * Page to create a new Repository in the workspace
 *
 * Uses {@link RepositoriesSection} to provide UI for new Repository creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the repositories page.
 */
export default async function RepositoryCreatePage() {
  const token = await getToken();
  const repositories = await getRepositories(token);
  return (
    <RepositoriesSection repositories={repositories} sideModalOpen={true} />
  );
}
