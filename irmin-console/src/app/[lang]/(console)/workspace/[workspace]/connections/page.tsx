import ConnectionsSection from '@/components/connection/ConnectionsSection';

import { WorkspaceLayoutParams } from '../layout';

/**
 * Connections page in the workspace
 *
 * Uses {@link ConnectionsSection} to provide UI to list connections
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default async function ConnectionsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  return <ConnectionsSection sideModalOpen={openSideModal} />;
}
