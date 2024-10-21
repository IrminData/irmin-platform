'use server';

import { getCollections } from '@/lib/actions/collections';
import { getConnections } from '@/lib/actions/connections';
import { getInvites } from '@/lib/actions/invites';
import { getRepositories } from '@/lib/actions/repositories';
import { getUsers } from '@/lib/actions/users';
import { getWorkflows } from '@/lib/actions/workflows';
import { getWorkspaces } from '@/lib/actions/workspaces';
import { initDict } from '@/lib/initDict';

import {
  ConsoleSearchItem,
  ConsoleSearchItemType,
} from '@/types/internal/ConsoleSearch';

export async function generateSearchItems({
  workspace,
}: {
  workspace?: string;
}): Promise<ConsoleSearchItem[]> {
  try {
    const { dict, locale } = await initDict();

    const newItems: ConsoleSearchItem[] = [];

    // Add workspaces
    const workspaces = await getWorkspaces();
    workspaces.forEach((ws) => {
      newItems.push({
        title: ws.name,
        description: ws.description ?? '-',
        link: `/${locale}/console/${workspace}/home`,
        type: ConsoleSearchItemType.Workspace,
      });
    });

    // Add static Irmin items
    newItems.push(
      {
        title: dict.consoleNavigation.staticSearchItems.irminWebsite,
        description:
          dict.consoleNavigation.staticSearchItems.description.irminWebsite,
        link: `/${locale}`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.contactUs,
        description:
          dict.consoleNavigation.staticSearchItems.description.contactUs,
        link: `/${locale}/contact`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.guides,
        description:
          dict.consoleNavigation.staticSearchItems.description.guides,
        link: `/${locale}/guides`,
        type: ConsoleSearchItemType.Irmin,
      }
      // Add other static items similarly
    );

    if (workspace) {
      const [
        connections,
        collections,
        invites,
        users,
        workflows,
        repositories,
      ] = await Promise.all([
        getConnections(),
        getCollections(),
        getInvites(workspace),
        getUsers(),
        getWorkflows(),
        getRepositories(),
      ]);

      // Add workspace-dependent static Irmin items
      newItems.push(
        {
          title: dict.consoleNavigation.staticSearchItems.logs,
          description:
            dict.consoleNavigation.staticSearchItems.description.logs,
          link: `/${locale}/console/${workspace}/logs`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title:
            dict.consoleNavigation.staticSearchItems.workspaceDocumentation,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .workspaceDocumentation,
          link: `/${locale}/console/${workspace}/documentation`,
          type: ConsoleSearchItemType.Irmin,
        }
        // Add other workspace-dependent items similarly
      );

      // Add users
      users.forEach((user) => {
        const roleString =
          user.roles?.map((role) => role.label).join(', ') ?? '';
        newItems.push({
          title: user.name,
          description: `${user.email}${
            user.company ? ` - ${user.company}` : ''
          } - ${roleString}`,
          link: `/${locale}/console/${workspace}/settings/users`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add invites
      invites.forEach((invite) => {
        const roleString = invite.role.label;
        newItems.push({
          title: invite.name,
          description: `${invite.email} - ${roleString} - ${dict.usersPermissions.invite}`,
          link: `/${locale}/console/${workspace}/settings/invites`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add workflows
      workflows.forEach((workflow) => {
        newItems.push({
          title: workflow.name,
          description: workflow.description ?? '-',
          link: `/${locale}/console/${workspace}/workflows/${workflow.id}`,
          type: ConsoleSearchItemType.Workflow,
        });
      });

      // Add connections
      connections.forEach((connection) => {
        newItems.push({
          title: connection.name,
          description: connection.description ?? '-',
          link: `/${locale}/console/${workspace}/connections/${connection.id}`,
          type: ConsoleSearchItemType.Connection,
        });
      });

      // Add repositories
      repositories.forEach((repository) => {
        newItems.push({
          title: repository.name,
          description: repository.description ?? '-',
          link: `/${locale}/console/${workspace}/repositories/${repository.slug}`,
          type: ConsoleSearchItemType.Repository,
        });
      });

      // Add collections
      collections.forEach((collection) => {
        if (newItems.some((item) => item.title === collection.formatted_name))
          return;
        const typeLabel =
          collection.type === 'table'
            ? dict.repository.schema.table
            : collection.type === 'folder'
              ? dict.repository.schema.folder
              : collection.type === 'file'
                ? dict.repository.schema.file
                : '';
        newItems.push({
          title: collection.formatted_name,
          description: typeLabel,
          link: `/${locale}/console/${workspace}/repositories/${collection.repository}`,
          type: ConsoleSearchItemType.Collection,
        });
      });
    }

    return newItems;
  } catch (error) {
    console.error('Error generating search items:', error);
    throw error;
  }
}
