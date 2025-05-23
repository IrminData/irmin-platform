import RepositoriesSection from '@/components/repository/RepositoriesSection';

import { WorkspaceLayoutParams } from '../layout';

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
export default async function RepositoriesPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;

  return <RepositoriesSection sideModalOpen={openSideModal} />;
}
