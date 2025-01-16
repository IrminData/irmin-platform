import { Metadata } from 'next';

import { WorkspaceLayoutParams } from '@/app/[lang]/(console)/workspace/[workspace]/layout';

import DocumentationLayoutWrapper from '@/components/documentation/DocumentationLayoutWrapper';

/**
 * SEO metadata for the Documentation pages
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Documentation | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Documentations pages in the Console
 */
export default async function ConsoleDocumentationLayout(props: {
  params: Promise<WorkspaceLayoutParams>;
  children: React.ReactNode;
}) {
  const params = await props.params;

  const { children } = props;

  return (
    <DocumentationLayoutWrapper params={params}>
      {children}
    </DocumentationLayoutWrapper>
  );
}
