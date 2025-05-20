'use server';

import type { Metadata } from 'next';

import { getWorkspaceInvites } from '@/lib/actions/invites';
import { getRoles } from '@/lib/actions/roles';
import { generateSearchItems } from '@/lib/actions/searchItems';
import { getUsers } from '@/lib/actions/users';
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

  const workspaceSlug = params.workspace;

  const token = await getToken();

  // Fetch the workspace, roles, users, and invites
  const [roles, users, invites, searchItems] = await Promise.all([
    getRoles({ token }),
    getUsers({ workspace: workspaceSlug, token }),
    getWorkspaceInvites({ workspace: workspaceSlug, token }),
    generateSearchItems({ workspace: workspaceSlug, token }),
  ]);

  return (
    <WorkspaceProvider workspaceSlug={workspaceSlug} searchItems={searchItems}>
      <UsersProvider
        currentWorkspace={workspaceSlug}
        roles={roles.data ?? []}
        currentUsers={users.data ?? []}
        currentInvites={invites.data ?? []}
      >
        {children}
      </UsersProvider>
    </WorkspaceProvider>
  );
}
