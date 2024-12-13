'use server';

import { getConnections } from '@/lib/actions/connections';
import { getInvites } from '@/lib/actions/invites';
import { getRepositories } from '@/lib/actions/repositories';
import { getUsers } from '@/lib/actions/users';
import { getWorkflows } from '@/lib/actions/workflows';
import { getWorkspaces } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';
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
    const token = await getToken();

    const newItems: ConsoleSearchItem[] = [];

    // Add workspaces
    const workspaces = await getWorkspaces(token);
    workspaces?.forEach((ws) => {
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
      },
      {
        title: dict.consoleNavigation.staticSearchItems.documentation,
        description:
          dict.consoleNavigation.staticSearchItems.description.documentation,
        link: `/${locale}/docs`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.termsAndPrivacy,
        description:
          dict.consoleNavigation.staticSearchItems.description.termsAndPrivacy,
        link: `/${locale}/terms-and-privacy`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.myProfile,
        description:
          dict.consoleNavigation.staticSearchItems.description.myProfile,
        link: `/${locale}/console/profile`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.manageWorkspaces,
        description:
          dict.consoleNavigation.staticSearchItems.description.manageWorkspaces,
        link: `/${locale}/console/manage-workspaces`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.createWorkspace,
        description:
          dict.consoleNavigation.staticSearchItems.description.createWorkspace,
        link: `/${locale}/console/manage-workspaces`,
        type: ConsoleSearchItemType.Irmin,
      }
    );

    if (workspace) {
      // Fetch workspace-dependent items
      const [connections, invites, users, workflows, repositories] =
        await Promise.all([
          getConnections(token),
          getInvites(workspace, undefined, false, false, token),
          getUsers(token),
          getWorkflows(token),
          getRepositories(token),
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
        },
        {
          title: dict.consoleNavigation.staticSearchItems.editor,
          description:
            dict.consoleNavigation.staticSearchItems.description.editor,
          link: `/${locale}/console/${workspace}/editor`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.workspaceSettings,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .workspaceSettings,
          link: `/${locale}/console/${workspace}/settings`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.workflows,
          description:
            dict.consoleNavigation.staticSearchItems.description.workflows,
          link: `/${locale}/console/${workspace}/workflows`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.actions,
          description:
            dict.consoleNavigation.staticSearchItems.description.actions,
          link: `/${locale}/console/${workspace}/workflows/actions`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.imports,
          description:
            dict.consoleNavigation.staticSearchItems.description.imports,
          link: `/${locale}/console/${workspace}/workflows/imports`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.exports,
          description:
            dict.consoleNavigation.staticSearchItems.description.exports,
          link: `/${locale}/console/${workspace}/workflows/exports`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.createWorkflow,
          description:
            dict.consoleNavigation.staticSearchItems.description.createWorkflow,
          link: `/${locale}/console/${workspace}/workflows/create`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.connections,
          description:
            dict.consoleNavigation.staticSearchItems.description.connections,
          link: `/${locale}/console/${workspace}/connections`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.createConnection,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .createConnection,
          link: `/${locale}/console/${workspace}/connections/create`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.repositories,
          description:
            dict.consoleNavigation.staticSearchItems.description.repositories,
          link: `/${locale}/console/${workspace}/repositories`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.createRepository,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .createRepository,
          link: `/${locale}/console/${workspace}/repositories/create`,
          type: ConsoleSearchItemType.Irmin,
        }
      );

      // Add users
      users?.forEach((user) => {
        const roleString =
          user.roles?.map((role) => role.label).join(', ') ?? '';
        newItems.push({
          title: `${user.first_name} ${user.last_name}`,
          description: `${user.email}${
            user.company ? ` - ${user.company}` : ''
          } - ${roleString}`,
          link: `/${locale}/console/${workspace}/settings/users`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add invites
      invites?.forEach((invite) => {
        const roleString = invite.role.label;
        newItems.push({
          title: `${invite.first_name} ${invite.last_name}`,
          description: `${invite.email} - ${roleString} - ${dict.users.invite}`,
          link: `/${locale}/console/${workspace}/settings/invites`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add workflows
      workflows?.forEach((workflow) => {
        newItems.push({
          title: workflow.name,
          description: workflow.description ?? '-',
          link: `/${locale}/console/${workspace}/workflows/${workflow.id}`,
          type: ConsoleSearchItemType.Workflow,
        });
      });

      // Add connections
      connections?.forEach((connection) => {
        newItems.push({
          title: connection.name,
          description: connection.description ?? '-',
          link: `/${locale}/console/${workspace}/connections/${connection.id}`,
          type: ConsoleSearchItemType.Connection,
        });
      });

      // Add repositories
      repositories?.forEach((repository) => {
        newItems.push({
          title: repository.name,
          description: repository.description ?? '-',
          link: `/${locale}/console/${workspace}/repositories/${repository.slug}`,
          type: ConsoleSearchItemType.Repository,
        });
      });
    }

    return newItems;
  } catch (error) {
    console.error('Error generating search items:', error);
    throw error;
  }
}
