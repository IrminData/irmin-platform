'use server';

import type { Metadata } from 'next';

import { getEditorItems } from '@/lib/actions/editor-items';
import { getInvites } from '@/lib/actions/invites';
import { getRoles } from '@/lib/actions/roles';
import { getUsers } from '@/lib/actions/users';
import { getWorkspace, switchWorkspace } from '@/lib/actions/workspaces';
import { Locale } from '@/lib/dict';

import { EditorItemsProvider } from '@/context/EditorItemsContext';
import { UsersProvider } from '@/context/UsersContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

export type WorkspaceLayoutParams = {
  lang: Locale;
  workspace: string;
};

/**
 * Generate default SEO metadata for the console workspace pages.
 */
export async function generateMetadata(props: {
  params: Promise<WorkspaceLayoutParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Workspace ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Console workspace layout
 * Provides the {@link UsersProvider}, {@link WorkspaceProvider} and {@link EditorItemsProvider} contexts for the workspace pages.
 */
export default async function ConsoleWorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;

  const { children } = props;

  const currentWorkspace = params.workspace;

  // Switch to the current workspace
  await switchWorkspace(currentWorkspace);

  // Fetch the workspace, roles, users, invites, and editorItems
  const [workspace, roles, users, invites, editorItems] = await Promise.all([
    getWorkspace(currentWorkspace),
    getRoles(),
    getUsers(),
    getInvites(),
    getEditorItems(),
  ]);

  return (
    <WorkspaceProvider
      initialWorkspace={workspace}
      workspaceSlug={currentWorkspace}
    >
      <UsersProvider
        roles={roles}
        currentUsers={users}
        currentInvites={invites}
      >
        <EditorItemsProvider editorItems={editorItems}>
          {children}
        </EditorItemsProvider>
      </UsersProvider>
    </WorkspaceProvider>
  );
}
