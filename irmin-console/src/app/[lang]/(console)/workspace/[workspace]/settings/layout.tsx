import { Metadata } from 'next';

import WorkspaceSettingsLayoutWrapper from '@/components/workspace/WorkspaceSettingsLayoutWrapper';

import { WorkspaceLayoutParams } from '../layout';

/**
 * SEO metadata for the Workspace Settings layout
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workspace Settings | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Workspace settings pages in the Console
 * @param props0 - The layout properties
 * @param props0.children - The children to render
 */
export default function WorkspaceSettingsLayout({
  children,
}: {
  children: React.ReactNode;
  params: WorkspaceLayoutParams;
}) {
  return (
    <WorkspaceSettingsLayoutWrapper>{children}</WorkspaceSettingsLayoutWrapper>
  );
}
