import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

import DocumentationSection from '@/components/documentation/DocumentationSection';

/**
 * Page to show the full documentation for the workspace
 */
export default function DocumentationPage({
  params,
}: {
  params: WorkspaceLayoutParams;
}) {
  return <DocumentationSection params={params} />;
}
