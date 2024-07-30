'use client';

import { createContext, useContext } from 'react';

import { Dashboard } from '@/types/api/Dashboard';
import { Dataset } from '@/types/api/Dataset';
import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Context for the workspace
 */
export const WorkspaceContext = createContext<{
  workspaceLoading: boolean;
  irminRoles: IrminRole[];
  workspaces: {
    workspaces: Workspace[];
    fetchWorkspaces: () => void;
    switchToWorkspace: (_workspaceSlug: string | null) => void;
    deleteCurrentWorkspace: () => Promise<IrminAPIResponse>;
    transferOwnership: (_userId: number) => Promise<IrminAPIResponse>;
    currentWorkspace: Workspace | null;
    workspacesLoading: boolean;
  };
  users: {
    users: WorkspaceUser[];
    isLoading: boolean;
    fetchUsers: (_forceFetch?: boolean) => void;
    deleteUser: (_userId: number) => Promise<IrminAPIResponse>;
    changeUserRole: (
      _userId: number,
      _role: IrminRoleNames
    ) => Promise<IrminAPIResponse>;
  };
  invites: {
    invites: Invite[];
    isLoading: boolean;
    fetchInvites: (_forceFetch?: boolean) => void;
    sendInvite: (
      _name: string,
      _email: string,
      _role: IrminRoleNames
    ) => Promise<IrminAPIResponse>;
    resendInvite: (_inviteId: number) => Promise<IrminAPIResponse>;
    cancelInvite: (_inviteId: number) => Promise<IrminAPIResponse>;
    changeInvite: (
      _inviteId: number,
      _role: IrminRole
    ) => Promise<IrminAPIResponse>;
  };
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
  workspaceLoading: false,
  irminRoles: [],
  workspaces: {
    workspaces: [],
    switchToWorkspace: () => {},
    fetchWorkspaces: () => {},
    deleteCurrentWorkspace: () => Promise.resolve({}),
    transferOwnership: () => Promise.resolve({}),
    workspacesLoading: false,
    currentWorkspace: null,
  },
  users: {
    users: [],
    isLoading: false,
    fetchUsers: () => {},
    deleteUser: () => Promise.resolve({}),
    changeUserRole: () => Promise.resolve({}),
  },
  invites: {
    invites: [],
    isLoading: false,
    fetchInvites: () => {},
    sendInvite: () => Promise.resolve({}),
    resendInvite: () => Promise.resolve({}),
    cancelInvite: () => Promise.resolve({}),
    changeInvite: () => Promise.resolve({}),
  },
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

/**
 * Hook to use the workspace context
 */
export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
