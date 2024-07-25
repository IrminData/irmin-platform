'use client';

import { createContext } from 'react';

import { Dashboard } from '@/types/api/Dashboard';
import { Dataset } from '@/types/api/Dataset';
import { IrminRole } from '@/types/api/IrminRole';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Workspace context
 *
 * @remarks
 *
 * Context for handling workspace data.
 *
 * It provides the current workspace, workspaces list, and methods to fetch and switch workspaces.
 *
 * The context also provides data for dashboards, connections, exports, actions and datasets.
 *
 * @returns The workspace context
 */
const WorkspaceContext = createContext<{
  fetchWorkspaces: () => void;
  switchToWorkspace: (_workspaceSlug: string | null) => void;
  deleteCurrentWorkspace: () => void;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  workspaceLoading: boolean;
  irminRoles: IrminRole[];
  dashboards: {
    dashboards: Dashboard[];
    isLoading: boolean;
    fetchDashboards: (_forceFetch?: boolean) => void;
  };
  connections: {
    connections: ConnectionWorkflow[];
    isLoading: boolean;
    fetchConnections: (_forceFetch?: boolean) => void;
  };
  exports: {
    exports: ExportWorkflow[];
    isLoading: boolean;
    fetchExports: (_forceFetch?: boolean) => void;
  };
  actions: {
    actions: ActionWorkflow[];
    isLoading: boolean;
    fetchActions: (_forceFetch?: boolean) => void;
  };
  datasets: {
    datasets: Dataset[];
    isLoading: boolean;
    fetchDatasets: (_forceFetch?: boolean) => void;
  };
}>({
  switchToWorkspace: () => {},
  fetchWorkspaces: () => {},
  deleteCurrentWorkspace: () => {},
  workspaces: [],
  workspaceLoading: false,
  currentWorkspace: null,
  irminRoles: [],
  dashboards: {
    dashboards: [],
    isLoading: false,
    fetchDashboards: () => {},
  },
  connections: {
    connections: [],
    isLoading: false,
    fetchConnections: () => {},
  },
  exports: {
    exports: [],
    isLoading: false,
    fetchExports: () => {},
  },
  actions: {
    actions: [],
    isLoading: false,
    fetchActions: () => {},
  },
  datasets: {
    datasets: [],
    isLoading: false,
    fetchDatasets: () => {},
  },
});

export default WorkspaceContext;
