'use server';

import { getConnections } from '@/lib/actions/connections';
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
  token,
}: {
  workspace?: string;
  token?: string;
}): Promise<ConsoleSearchItem[]> {
  try {
    const { dict, locale } = await initDict();
    if (!token) {
      token = await getToken();
    }

    const newItems: ConsoleSearchItem[] = [];

    // Add workspaces
    const { data: workspaces } = await getWorkspaces({ token }).catch(() => ({
      data: [],
    }));
    workspaces?.forEach((ws) => {
      newItems.push({
        title: ws.name,
        description: ws.description ?? '-',
        link: `/${locale}/workspace/${workspace}/home`,
        type: ConsoleSearchItemType.Workspace,
      });
    });

    // Add static Irmin items
    newItems.push(
      {
        title: dict.consoleNavigation.irminWebsite,
        description:
          dict.consoleNavigation.staticSearchItems.description.irminWebsite,
        link: `/${locale}`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.common.contactUs,
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
        link: `/${locale}/profile`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.manageWorkspaces,
        description:
          dict.consoleNavigation.staticSearchItems.description.manageWorkspaces,
        link: `/${locale}/workspace`,
        type: ConsoleSearchItemType.Irmin,
      },
      {
        title: dict.consoleNavigation.staticSearchItems.createWorkspace,
        description:
          dict.consoleNavigation.staticSearchItems.description.createWorkspace,
        link: `/${locale}/workspace`,
        type: ConsoleSearchItemType.Irmin,
      }
    );

    if (workspace) {
      // Fetch workspace-dependent items
      const [connections, users, workflows, repositories] = await Promise.all([
        getConnections({ workspace, token }).catch(() => ({ data: [] })),
        getUsers({ workspace, token }).catch(() => ({ data: [] })),
        getWorkflows({ workspace, token }).catch(() => ({ data: [] })),
        getRepositories({ workspace, token }).catch(() => ({ data: [] })),
      ]);

      // Add workspace-dependent static Irmin items
      newItems.push(
        {
          title: dict.logs.workspaceLogs,
          description:
            dict.consoleNavigation.staticSearchItems.description.logs,
          link: `/${locale}/workspace/${workspace}/logs`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title:
            dict.consoleNavigation.staticSearchItems.workspaceDocumentation,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .workspaceDocumentation,
          link: `/${locale}/workspace/${workspace}/documentation`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.editor,
          description:
            dict.consoleNavigation.staticSearchItems.description.editor,
          link: `/${locale}/workspace/${workspace}/editor`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.workspaceSettings,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .workspaceSettings,
          link: `/${locale}/workspace/${workspace}/settings`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.workflow.workflows,
          description:
            dict.consoleNavigation.staticSearchItems.description.workflows,
          link: `/${locale}/workspace/${workspace}/workflows`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.workflow.actionWorkflows,
          description:
            dict.consoleNavigation.staticSearchItems.description.actions,
          link: `/${locale}/workspace/${workspace}/workflows/actions`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.workflow.importWorkflows,
          description:
            dict.consoleNavigation.staticSearchItems.description.imports,
          link: `/${locale}/workspace/${workspace}/workflows/imports`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.workflow.exportWorkflows,
          description:
            dict.consoleNavigation.staticSearchItems.description.exports,
          link: `/${locale}/workspace/${workspace}/workflows/exports`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.workflow.pipelineWorkflows,
          description:
            dict.consoleNavigation.staticSearchItems.description.pipelines,
          link: `/${locale}/workspace/${workspace}/workflows/pipelines`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.createWorkflow,
          description:
            dict.consoleNavigation.staticSearchItems.description.createWorkflow,
          link: `/${locale}/workspace/${workspace}/workflows?create`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.connections.connections,
          description:
            dict.consoleNavigation.staticSearchItems.description.connections,
          link: `/${locale}/workspace/${workspace}/connections`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.createConnection,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .createConnection,
          link: `/${locale}/workspace/${workspace}/connections?create`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.repository.repositories,
          description:
            dict.consoleNavigation.staticSearchItems.description.repositories,
          link: `/${locale}/workspace/${workspace}/repositories`,
          type: ConsoleSearchItemType.Irmin,
        },
        {
          title: dict.consoleNavigation.staticSearchItems.createRepository,
          description:
            dict.consoleNavigation.staticSearchItems.description
              .createRepository,
          link: `/${locale}/workspace/${workspace}/repositories?create`,
          type: ConsoleSearchItemType.Irmin,
        }
      );

      // Add users
      users.data?.forEach((user) => {
        const roleString =
          user.roles?.map((role) => role.label).join(', ') ?? '';
        newItems.push({
          title: `${user.first_name} ${user.last_name}`,
          description: `${user.email}${
            user.company ? ` - ${user.company}` : ''
          } - ${roleString}`,
          link: `/${locale}/workspace/${workspace}/settings/users`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add workflows
      workflows.data?.forEach((workflow) => {
        newItems.push({
          title: workflow.name,
          description: workflow.description ?? '-',
          link: `/${locale}/workspace/${workspace}/workflows/${workflow.id}`,
          type: ConsoleSearchItemType.Workflow,
        });
      });

      // Add connections
      connections.data?.forEach((connection) => {
        newItems.push({
          title: connection.name,
          description: connection.description ?? '-',
          link: `/${locale}/workspace/${workspace}/connections/${connection.id}`,
          type: ConsoleSearchItemType.Connection,
        });
      });

      // Add repositories
      repositories.data?.forEach((repository) => {
        newItems.push({
          title: repository.name,
          description: repository.description ?? '-',
          link: `/${locale}/workspace/${workspace}/repositories/${repository.slug}`,
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
