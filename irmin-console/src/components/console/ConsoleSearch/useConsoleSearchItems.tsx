'use client';

import { useEffect, useState } from 'react';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

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
  const { dict, locale } = useLocale();
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
        link: `/${locale}/console/${workspace.slug}/home`,
        type: ConsoleSearchItemType.Workspace,
      });
    });

    // Add static Irmin items
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.irminWebsite,
      description:
        dict.consoleNavigation.staticSearchItems.description.irminWebsite,
      link: `/${locale}`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.contactUs,
      description:
        dict.consoleNavigation.staticSearchItems.description.contactUs,
      link: `/${locale}/contact`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.guides,
      description: dict.consoleNavigation.staticSearchItems.description.guides,
      link: `/${locale}/guides`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.documentation,
      description:
        dict.consoleNavigation.staticSearchItems.description.documentation,
      link: `/${locale}/docs`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.termsAndPrivacy,
      description:
        dict.consoleNavigation.staticSearchItems.description.termsAndPrivacy,
      link: `/${locale}/terms-and-privacy`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.myProfile,
      description:
        dict.consoleNavigation.staticSearchItems.description.myProfile,
      link: `/${locale}/console/profile`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.manageWorkspaces,
      description:
        dict.consoleNavigation.staticSearchItems.description.manageWorkspaces,
      link: `/${locale}/console/manage-workspaces`,
      type: ConsoleSearchItemType.Irmin,
    });
    newItems.push({
      title: dict.consoleNavigation.staticSearchItems.createWorkspace,
      description:
        dict.consoleNavigation.staticSearchItems.description.createWorkspace,
      link: `/${locale}/console/manage-workspaces`,
      type: ConsoleSearchItemType.Irmin,
    });

    // These next can only be added if there is a current workspace
    if (currentWorkspace) {
      // Add workspace dependent static Irmin items
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.logs,
        description: dict.consoleNavigation.staticSearchItems.description.logs,
        link: `/${locale}/console/${currentWorkspace.slug}/logs`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.workspaceDocumentation,
        description:
          dict.consoleNavigation.staticSearchItems.description
            .workspaceDocumentation,
        link: `/${locale}/console/${currentWorkspace.slug}/documentation`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.editor,
        description:
          dict.consoleNavigation.staticSearchItems.description.editor,
        link: `/${locale}/console/${currentWorkspace.slug}/editor`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.workspaceSettings,
        description:
          dict.consoleNavigation.staticSearchItems.description
            .workspaceSettings,
        link: `/${locale}/console/${currentWorkspace.slug}/settings`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.workflows,
        description:
          dict.consoleNavigation.staticSearchItems.description.workflows,
        link: `/${locale}/console/${currentWorkspace.slug}/workflows`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.actions,
        description:
          dict.consoleNavigation.staticSearchItems.description.actions,
        link: `/${locale}/console/${currentWorkspace.slug}/workflows/actions`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.imports,
        description:
          dict.consoleNavigation.staticSearchItems.description.imports,
        link: `/${locale}/console/${currentWorkspace.slug}/workflows/imports`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.exports,
        description:
          dict.consoleNavigation.staticSearchItems.description.exports,
        link: `/${locale}/console/${currentWorkspace.slug}/workflows/exports`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.createWorkflow,
        description:
          dict.consoleNavigation.staticSearchItems.description.createWorkflow,
        link: `/${locale}/console/${currentWorkspace.slug}/workflows/create`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.connections,
        description:
          dict.consoleNavigation.staticSearchItems.description.connections,
        link: `/${locale}/console/${currentWorkspace.slug}/connections`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.createConnection,
        description:
          dict.consoleNavigation.staticSearchItems.description.createConnection,
        link: `/${locale}/console/${currentWorkspace.slug}/connections/create`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.repositories,
        description:
          dict.consoleNavigation.staticSearchItems.description.repositories,
        link: `/${locale}/console/${currentWorkspace.slug}/repositories`,
        type: ConsoleSearchItemType.Irmin,
      });
      newItems.push({
        title: dict.consoleNavigation.staticSearchItems.createRepository,
        description:
          dict.consoleNavigation.staticSearchItems.description.createRepository,
        link: `/${locale}/console/${currentWorkspace.slug}/repositories/create`,
        type: ConsoleSearchItemType.Irmin,
      });

      // Add users and invites
      users.forEach((user) => {
        const roleString =
          user.roles?.flatMap((role) => role.label).join(', ') ?? '';
        newItems.push({
          title: user.name,
          description: `${user.email}${user.company ? ` - ${user.company}` : ''} - ${roleString}`,
          link: `/${locale}/console/${currentWorkspace.slug}/settings`,
          type: ConsoleSearchItemType.User,
        });
      });
      invites.forEach((invite) => {
        const roleString = invite.role.label;
        newItems.push({
          title: invite.name,
          description: `${invite.email}  - ${roleString} - ${dict.usersPermissions.invited}`,
          link: `/${locale}/console/${currentWorkspace.slug}/settings`,
          type: ConsoleSearchItemType.User,
        });
      });

      // Add workflows
      allWorkflows.forEach((workflow) => {
        newItems.push({
          title: workflow.name,
          description: workflow.description ?? '-',
          link: `/${locale}/console/${currentWorkspace.slug}/workflows/${workflow.id}`,
          type: ConsoleSearchItemType.Workflow,
        });
      });

      // Add connections
      connections.forEach((connection) => {
        newItems.push({
          title: connection.name,
          description: connection.description ?? '-',
          link: `/${locale}/console/${currentWorkspace.slug}/connections/${connection.id}`,
          type: ConsoleSearchItemType.Connection,
        });
      });

      // Add repositories
      repositories.forEach((repository) => {
        newItems.push({
          title: repository.name,
          description: repository.description ?? '-',
          link: `/${locale}/console/${currentWorkspace.slug}/repositories/${repository.slug}`,
          type: ConsoleSearchItemType.Repository,
        });
      });

      // Add collections
      const allCollections = repositories.flatMap(
        (repository) => repository.collections
      );
      allCollections.forEach((collection) => {
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
          link: `/${locale}/console/${currentWorkspace.slug}/repositories/${collection.repository}`,
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
    dict,
    locale,
  ]);

  return items;
}
