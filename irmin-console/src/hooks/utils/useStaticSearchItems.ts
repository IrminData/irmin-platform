import { useMemo } from 'react';

import type { Dictionary } from '@/lib/dict';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaces } from '@/hooks/api';

import type { Workspace } from '@/types/core/Workspace';
import type { ConsoleSearchItem } from '@/types/internal/ConsoleSearch';

/**
 * Helper function to check if search terms match a text
 * Splits search query into terms and checks if all terms are found in the text
 */
function matchesSearchTerms(searchQuery: string, text: string): boolean {
  if (!searchQuery || !text) return false;

  // Normalize both strings: lowercase and remove special characters
  const normalizedQuery = searchQuery
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '');
  const normalizedText = text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '');

  // Split query into individual terms
  const searchTerms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length > 0);

  // If no valid terms, return false
  if (searchTerms.length === 0) return false;

  // Check if ALL search terms are found in the text
  return searchTerms.every((term) => normalizedText.includes(term));
}

/**
 * Filter static search items by query and type filters
 */
export function filterStaticSearchItems(
  items: ConsoleSearchItem[],
  query?: string,
  typeFilters?: string[]
): ConsoleSearchItem[] {
  return items.filter((item) => {
    // Filter by query using improved search term matching
    const matchesQuery =
      !query ||
      query.length === 0 ||
      matchesSearchTerms(query, item.title) ||
      matchesSearchTerms(query, item.description);

    if (!matchesQuery) return false;

    // Filter by type if type filters are active
    if (typeFilters && typeFilters.length > 0) {
      return typeFilters.includes('irmin'); // Static items are all 'irmin' type
    }

    return true;
  });
}

function generateStaticSearchItems({
  workspace,
  locale,
  dict,
  workspaces,
}: {
  workspace?: string;
  locale: string;
  dict: Dictionary;
  workspaces?: Workspace[];
}): ConsoleSearchItem[] {
  const items: ConsoleSearchItem[] = [];

  // Add static Irmin items (general ones not dependent on workspace)
  items.push(
    {
      title: dict.consoleNavigation.irminWebsite,
      description:
        dict.consoleNavigation.staticSearchItems.description.irminWebsite,
      link: `/${locale}`,
      type: 'irmin',
    },
    {
      title: dict.common.contactUs,
      description:
        dict.consoleNavigation.staticSearchItems.description.contactUs,
      link: `/${locale}/contact`,
      type: 'irmin',
    },
    {
      title: dict.consoleNavigation.staticSearchItems.guides,
      description: dict.consoleNavigation.staticSearchItems.description.guides,
      link: `/${locale}/guides`,
      type: 'irmin',
    },
    {
      title: dict.consoleNavigation.staticSearchItems.documentation,
      description:
        dict.consoleNavigation.staticSearchItems.description.documentation,
      link: `/${locale}/docs`,
      type: 'irmin',
    },
    {
      title: dict.consoleNavigation.staticSearchItems.termsAndPrivacy,
      description:
        dict.consoleNavigation.staticSearchItems.description.termsAndPrivacy,
      link: `/${locale}/terms-and-privacy`,
      type: 'irmin',
    },
    {
      title: dict.consoleNavigation.staticSearchItems.myProfile,
      description:
        dict.consoleNavigation.staticSearchItems.description.myProfile,
      link: `/${locale}/profile`,
      type: 'irmin',
    },
    {
      title: dict.consoleNavigation.staticSearchItems.manageWorkspaces,
      description:
        dict.consoleNavigation.staticSearchItems.description.manageWorkspaces,
      link: `/${locale}/workspace`,
      type: 'irmin',
    },
    {
      title: dict.consoleNavigation.staticSearchItems.createWorkspace,
      description:
        dict.consoleNavigation.staticSearchItems.description.createWorkspace,
      link: `/${locale}/workspace`,
      type: 'irmin',
    }
  );

  // Add workspaces as search items
  if (workspaces && workspaces.length > 0) {
    workspaces.forEach((ws) => {
      items.push({
        title: ws.name,
        description: ws.description || '',
        link: `/${locale}/workspace/${ws.slug}`,
        type: 'workspace',
      });
    });
  }

  // Add workspace-dependent static items if workspace is provided
  if (workspace) {
    items.push(
      {
        title: dict.logs.workspaceLogs,
        description: dict.consoleNavigation.staticSearchItems.description.logs,
        link: `/${locale}/workspace/${workspace}/logs`,
        type: 'irmin',
      },
      {
        title: dict.consoleNavigation.staticSearchItems.workspaceDocumentation,
        description:
          dict.consoleNavigation.staticSearchItems.description
            .workspaceDocumentation,
        link: `/${locale}/workspace/${workspace}/documentation`,
        type: 'irmin',
      },
      {
        title: dict.consoleNavigation.staticSearchItems.editor,
        description:
          dict.consoleNavigation.staticSearchItems.description.editor,
        link: `/${locale}/workspace/${workspace}/editor`,
        type: 'irmin',
      },
      {
        title: dict.consoleNavigation.staticSearchItems.workspaceSettings,
        description:
          dict.consoleNavigation.staticSearchItems.description
            .workspaceSettings,
        link: `/${locale}/workspace/${workspace}/settings`,
        type: 'irmin',
      },
      {
        title: dict.workflow.workflows,
        description:
          dict.consoleNavigation.staticSearchItems.description.workflows,
        link: `/${locale}/workspace/${workspace}/workflows`,
        type: 'irmin',
      },
      {
        title: dict.workflow.actionWorkflows,
        description:
          dict.consoleNavigation.staticSearchItems.description.actions,
        link: `/${locale}/workspace/${workspace}/workflows/actions`,
        type: 'irmin',
      },
      {
        title: dict.workflow.importWorkflows,
        description:
          dict.consoleNavigation.staticSearchItems.description.imports,
        link: `/${locale}/workspace/${workspace}/workflows/imports`,
        type: 'irmin',
      },
      {
        title: dict.workflow.exportWorkflows,
        description:
          dict.consoleNavigation.staticSearchItems.description.exports,
        link: `/${locale}/workspace/${workspace}/workflows/exports`,
        type: 'irmin',
      },
      {
        title: dict.workflow.pipelineWorkflows,
        description:
          dict.consoleNavigation.staticSearchItems.description.pipelines,
        link: `/${locale}/workspace/${workspace}/workflows/pipelines`,
        type: 'irmin',
      },
      {
        title: dict.consoleNavigation.staticSearchItems.createWorkflow,
        description:
          dict.consoleNavigation.staticSearchItems.description.createWorkflow,
        link: `/${locale}/workspace/${workspace}/workflows?create`,
        type: 'irmin',
      },
      {
        title: dict.connections.connections,
        description:
          dict.consoleNavigation.staticSearchItems.description.connections,
        link: `/${locale}/workspace/${workspace}/connections`,
        type: 'irmin',
      },
      {
        title: dict.consoleNavigation.staticSearchItems.createConnection,
        description:
          dict.consoleNavigation.staticSearchItems.description.createConnection,
        link: `/${locale}/workspace/${workspace}/connections?create`,
        type: 'irmin',
      },
      {
        title: dict.repository.repositories,
        description:
          dict.consoleNavigation.staticSearchItems.description.repositories,
        link: `/${locale}/workspace/${workspace}/repositories`,
        type: 'irmin',
      },
      {
        title: dict.consoleNavigation.staticSearchItems.createRepository,
        description:
          dict.consoleNavigation.staticSearchItems.description.createRepository,
        link: `/${locale}/workspace/${workspace}/repositories?create`,
        type: 'irmin',
      }
    );
  }

  return items;
}

export function useStaticSearchItems(workspace?: string) {
  const { dict, locale } = useLocale();
  const { workspacesQuery } = useWorkspaces();

  const staticSearchItems = useMemo(() => {
    // Extract workspaces data from the query
    const workspaces = workspacesQuery.data?.data || [];

    return generateStaticSearchItems({
      workspace,
      locale,
      dict,
      workspaces,
    });
  }, [workspace, locale, dict, workspacesQuery.data]);

  return {
    staticSearchItemsQuery: {
      data: staticSearchItems,
      isLoading: workspacesQuery.isLoading,
      error: workspacesQuery.error,
    },
  };
}
