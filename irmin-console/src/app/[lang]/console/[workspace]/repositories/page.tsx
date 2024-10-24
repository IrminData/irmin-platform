import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import RepositoriesSection from '@/components/repository/RepositoriesSection';

/**
 * Repositories page in the workspace
 *
 * Uses {@link RepositoriesSection} to provide UI to list repositories
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function RepositoriesPage() {
  const token = await getToken();
  const repositories = await getRepositories(token);
  return (
    <RepositoriesSection repositories={repositories} sideModalOpen={false} />
  );
}
