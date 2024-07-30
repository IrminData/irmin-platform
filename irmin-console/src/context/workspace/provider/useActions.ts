'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { useFetchActions } from '@/context/workspace';

import { ActionWorkflow } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for actions to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useActions = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Actions
  const [actions, setActions] = useState<ActionWorkflow[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsFetchedFor, setActionsFetchedFor] = useState<string | null>(
    null
  );

  /**
   * Hook to fetch the actions for the current workspace.
   * It will be run whenever the current workspace changes to update the actions.
   */
  const fetchActions = useFetchActions(
    currentWorkspace,
    setActions,
    actionsLoading,
    setActionsLoading,
    actionsFetchedFor,
    setActionsFetchedFor,
    locale
  );

  return {
    actions,
    actionsLoading,
    fetchActions,
  };
};

export default useActions;
