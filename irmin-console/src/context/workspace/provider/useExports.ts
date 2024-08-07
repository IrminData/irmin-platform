'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { useFetchExports } from '@/context/workspace/hooks/exports';

import { ExportWorkflow } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for exports to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useExports = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Exports
  const [exports, setExports] = useState<ExportWorkflow[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [exportsFetchedFor, setExportsFetchedFor] = useState<string | null>(
    null
  );

  /**
   * Hook to fetch the exports for the current workspace.
   */
  const fetchExports = useFetchExports(
    currentWorkspace,
    setExports,
    exportsLoading,
    setExportsLoading,
    exportsFetchedFor,
    setExportsFetchedFor,
    locale
  );

  return {
    exports,
    exportsLoading,
    fetchExports,
    setExports,
  };
};

export default useExports;
