'use server';

import type { Metadata } from 'next';

import { getInvites } from '@/lib/actions/invites';
import { getRoles } from '@/lib/actions/roles';
import { getUsers } from '@/lib/actions/users';
import { getWorkspace, switchWorkspace } from '@/lib/actions/workspaces';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

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
 * Provides the {@link UsersProvider} and {@link WorkspaceProvider} contexts for the workspace pages.
 */
export default async function ConsoleWorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;

  const { children } = props;

  const currentWorkspace = params.workspace;

  const token = await getToken();

  // Switch to the current workspace
  await switchWorkspace(currentWorkspace, token);

  // Fetch the workspace, roles, users, and invites
  const [workspace, roles, users, invites] = await Promise.all([
    getWorkspace(currentWorkspace, token),
    getRoles(token),
    getUsers(token),
    getInvites(currentWorkspace, undefined, false, false, token),
  ]);

  return (
    <WorkspaceProvider
      initialWorkspace={workspace}
      workspaceSlug={currentWorkspace}
    >
      <UsersProvider
        currentWorkspace={currentWorkspace}
        roles={roles}
        currentUsers={users}
        currentInvites={invites}
      >
        {children}
      </UsersProvider>
    </WorkspaceProvider>
  );
}
