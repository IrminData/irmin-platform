import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/console/[workspace]/layout';

import DocumentationLayoutWrapper from '@/components/documentation/DocumentationLayoutWrapper';

/**
 * SEO metadata for the Documentation pages
 */
export async function generateMetadata({
  params,
}: {
  params: WorkspaceLayoutParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Documentation | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Documentations pages in the Console
 */
export default function ConsoleDocumentationLayout({
  params,
  children,
}: {
  params: WorkspaceLayoutParams;
  children: React.ReactNode;
}) {
  return (
    <DocumentationLayoutWrapper params={params}>
      {children}
    </DocumentationLayoutWrapper>
  );
}
