'use client';

import { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Collection } from '@/types/core/Collection';
import {
  ConsoleSearchItem,
  ConsoleSearchItemType,
} from '@/types/internal/ConsoleSearch';

/**
 * Hook to construct console search items
 *
 * Constructs the console search items based on the current workspace and user data.
 *
 * @returns The console search items
 */
export function useConsoleSearchItems() {
  const params = useParams();
  const { dict } = useLocale();
  const [items, setItems] = useState<ConsoleSearchItem[]>([]);

  const {
    workspaceLoading,
    workspaces: { workspaces, currentWorkspace },
    users: { users },
    invites: { invites },
    workflows: { allWorkflows },
    connections: { connections },
    repositories: { repositories },
  } = useWorkspace();

  const [collections, setCollections] = useState<Collection[]>([]);

  const { irminCore } = useIrminCore();

  useEffect(() => {
    try {
      (async () => {
        const res = await irminCore.collectionService.fetchCollections();
        setCollections(res.data);
      })();
    } catch (error) {
      console.error((error as Error).message, 'Fetch Collections error');
    }
  }, [irminCore.collectionService]);

  useEffect(() => {
    // Return if workspace is loading
    if (workspaceLoading) {
      return;
    }

    // Construct the new items
    const newItems: ConsoleSearchItem[] = [];

    // Add workspaces
    workspaces.forEach((workspace) => {
      newItems.push({
        title: workspace.name,
        description: workspace.description ?? '-',
        link: `/${params.lang}/console/${params.workspace}/home`,
        type: ConsoleSearchItemType.Workspace,
      });
    });

    // Add static Irmin items
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.irminWebsite,
      description:
        dict.consoleNavigation.staticSearchItems.description.irminWebsite,
      link: `/${params.lang}`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.contactUs,
      description:
        dict.consoleNavigation.staticSearchItems.description.contactUs,
      link: `/${params.lang}/contact`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.guides,
      description: dict.consoleNavigation.staticSearchItems.description.guides,
      link: `/${params.lang}/guides`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.documentation,
      description:
        dict.consoleNavigation.staticSearchItems.description.documentation,
      link: `/${params.lang}/docs`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.termsAndPrivacy,
      description:
        dict.consoleNavigation.staticSearchItems.description.termsAndPrivacy,
      link: `/${params.lang}/terms-and-privacy`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.myProfile,
      description:
        dict.consoleNavigation.staticSearchItems.description.myProfile,
      link: `/${params.lang}/console/profile`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.manageWorkspaces,
      description:
        dict.consoleNavigation.staticSearchItems.description.manageWorkspaces,
      link: `/${params.lang}/console/manage-workspaces`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.createWorkspace,
      description:
        dict.consoleNavigation.staticSearchItems.description.createWorkspace,
      link: `/${params.lang}/console/manage-workspaces`,
      type: ConsoleSearchItemType.Irmin,
    });

    // These next can only be added if there is a current workspace
    if (currentWorkspace) {
      // Add workspace dependent static Irmin items
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.logs,
        description: dict.consoleNavigation.staticSearchItems.description.logs,
        link: `/${params.lang}/console/${params.workspace}/logs`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.workspaceDocumentation,
        description:
          dict.consoleNavigation.staticSearchItems.description
            .workspaceDocumentation,
        link: `/${params.lang}/console/${params.workspace}/documentation`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.editor,
        description:
          dict.consoleNavigation.staticSearchItems.description.editor,
        link: `/${params.lang}/console/${params.workspace}/editor`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.workspaceSettings,
        description:
          dict.consoleNavigation.staticSearchItems.description
            .workspaceSettings,
        link: `/${params.lang}/console/${params.workspace}/settings`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.workflows,
        description:
          dict.consoleNavigation.staticSearchItems.description.workflows,
        link: `/${params.lang}/console/${params.workspace}/workflows`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.actions,
        description:
          dict.consoleNavigation.staticSearchItems.description.actions,
        link: `/${params.lang}/console/${params.workspace}/workflows/actions`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.imports,
        description:
          dict.consoleNavigation.staticSearchItems.description.imports,
        link: `/${params.lang}/console/${params.workspace}/workflows/imports`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.exports,
        description:
          dict.consoleNavigation.staticSearchItems.description.exports,
        link: `/${params.lang}/console/${params.workspace}/workflows/exports`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.createWorkflow,
        description:
          dict.consoleNavigation.staticSearchItems.description.createWorkflow,
        link: `/${params.lang}/console/${params.workspace}/workflows/create`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.connections,
        description:
          dict.consoleNavigation.staticSearchItems.description.connections,
        link: `/${params.lang}/console/${params.workspace}/connections`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.createConnection,
        description:
          dict.consoleNavigation.staticSearchItems.description.createConnection,
        link: `/${params.lang}/console/${params.workspace}/connections/create`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.repositories,
        description:
          dict.consoleNavigation.staticSearchItems.description.repositories,
        link: `/${params.lang}/console/${params.workspace}/repositories`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.createRepository,
        description:
          dict.consoleNavigation.staticSearchItems.description.createRepository,
        link: `/${params.lang}/console/${params.workspace}/repositories/create`,
        type: ConsoleSearchItemType.Irmin,
      });

      // Add users
      users.forEach((user) => {
        const roleString =
          user.roles?.flatMap((role) => role.label).join(', ') ?? '';
        newItems.push({
          title: user.name,
          description: `${user.email}${user.company ? ` - ${user.company}` : ''} - ${roleString}`,
          link: `/${params.lang}/console/${params.workspace}/settings/users`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add invites
      invites.forEach((invite) => {
        const roleString = invite.role.label;
        newItems.push({
          title: invite.name,
          description: `${invite.email}  - ${roleString} - ${dict.usersPermissions.invite}`,
          link: `/${params.lang}/console/${params.workspace}/settings/invites`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add workflows
      allWorkflows.forEach((workflow) => {
        newItems.push({
          title: workflow.name,
          description: workflow.description ?? '-',
          link: `/${params.lang}/console/${params.workspace}/workflows/${workflow.id}`,
          type: ConsoleSearchItemType.Workflow,
        });
      });

      // Add connections
      connections.forEach((connection) => {
        newItems.push({
          title: connection.name,
          description: connection.description ?? '-',
          link: `/${params.lang}/console/${params.workspace}/connections/${connection.id}`,
          type: ConsoleSearchItemType.Connection,
        });
      });

      // Add repositories
      repositories.forEach((repository) => {
        newItems.push({
          title: repository.name,
          description: repository.description ?? '-',
          link: `/${params.lang}/console/${params.workspace}/repositories/${repository.slug}`,
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
          link: `/${params.lang}/console/${params.workspace}/repositories/${collection.repository}`,
          type: ConsoleSearchItemType.Collection,
        });
      });
    }

    // Set the fetched items into state
    setItems(newItems);
  }, [
    currentWorkspace,
    workspaceLoading,
    workspaces,
    repositories,
    allWorkflows,
    connections,
    users,
    invites,
    collections,
    dict,
    params.lang,
    params.workspace,
  ]);

  return items;
}
