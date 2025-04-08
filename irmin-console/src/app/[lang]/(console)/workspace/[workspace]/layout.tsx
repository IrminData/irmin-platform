'use server';

import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getWorkspaceInvites } from '@/lib/actions/invites';
import { getRoles } from '@/lib/actions/roles';
import { getUsers } from '@/lib/actions/users';
import { getWorkspace } from '@/lib/actions/workspaces';
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

  // Fetch the workspace, roles, users, and invites
  const [workspace, roles, users, invites] = await Promise.all([
    getWorkspace({ workspaceSlug: currentWorkspace, token }),
    getRoles({ token }),
    getUsers({ workspace: currentWorkspace, token }),
    getWorkspaceInvites({ workspace: currentWorkspace, token }),
  ]);

  if (!workspace.data || !roles.data) return notFound();

  return (
    <WorkspaceProvider
      initialWorkspace={workspace.data}
      workspaceSlug={currentWorkspace}
    >
      <UsersProvider
        currentWorkspace={currentWorkspace}
        roles={roles.data}
        currentUsers={users.data ?? []}
        currentInvites={invites.data ?? []}
      >
        {children}
      </UsersProvider>
    </WorkspaceProvider>
  );
}
