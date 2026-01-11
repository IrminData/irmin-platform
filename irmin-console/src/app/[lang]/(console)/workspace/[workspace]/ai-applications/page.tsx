import AIApplicationsSection from '@/components/ai-application/AIApplicationsSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { WorkspaceLayoutParams } from '../layout';

/**
 * AI Applications page in the workspace
 *
 * Uses {@link AIApplicationsSection} to provide UI to list AI applications
 */
export default async function AIApplicationsPage(props: {
  params: Promise<WorkspaceLayoutParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const openSideModal = searchParams.create !== undefined;
  return <AIApplicationsSection sideModalOpen={openSideModal} />;
}
