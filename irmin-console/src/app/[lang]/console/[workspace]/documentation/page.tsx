import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

import DocumentationSection from '@/components/documentation/DocumentationSection';

/**
 * Page to show the full documentation for the workspace
 */
export default async function DocumentationPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  return <DocumentationSection params={params} />;
}
