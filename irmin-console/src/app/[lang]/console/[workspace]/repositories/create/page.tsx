import { getRepositories } from '@/lib/actions/repositories';

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
  const repositories = await getRepositories();
  return (
    <RepositoriesSection repositories={repositories} sideModalOpen={true} />
  );
}
