'use client';

import { createContext, useContext } from 'react';

import { WorkspaceProvider } from '@/context/workspace/WorkspaceProvider';

import { Dashboard } from '@/types/api/Dashboard';
import { DataRepo } from '@/types/api/DataRepo';
import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/api/Workflow';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Context for the workspace
 */
const WorkspaceContext = createContext<{
  workspaceLoading: boolean;
  irminRoles: IrminRole[];
  workspaces: {
    workspaces: Workspace[];
    fetchWorkspaces: () => void;
    switchToWorkspace: (_workspaceSlug: string | null) => void;
    deleteCurrentWorkspace: () => Promise<IrminAPIResponse>;
    transferOwnership: (_userId: number) => Promise<IrminAPIResponse>;
    createWorkspace: (
      _name: string,
      _description: string
    ) => Promise<IrminAPIResponse>;
    updateWorkspace: (_workspace: Workspace) => Promise<IrminAPIResponse>;
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
  dataRepositories: {
    dataRepositories: DataRepo[];
    isLoading: boolean;
    fetchDataRepositories: (_forceFetch?: boolean) => void;
    createDataRepository: (_dataRepo: DataRepo) => Promise<IrminAPIResponse>;
    updateDataRepository: (
      _dataRepoSlug: string,
      _updatedDataRepo: DataRepo
    ) => Promise<IrminAPIResponse>;
    deleteDataRepository: (_dataRepoSlug: string) => Promise<IrminAPIResponse>;
    reassignDataRepository: (
      _dataRepo: DataRepo,
      _newOwner: WorkspaceUser
    ) => Promise<IrminAPIResponse>;
  };
  workflows: {
    workflowRuns: WorkflowRun[];
    workflowRunsLoading: boolean;
    fetchWorkflowRuns: (_forceFetch?: boolean) => void;
    fetchWorkflowRunsByWorkflow: (_workflowId: number) => void;
    updateWorkflow: (
      _workflowId: number,
      _updatedWorkflow: Workflow
    ) => Promise<IrminAPIResponse | undefined>;
    deleteWorkflow: (
      _workflowId: number
    ) => Promise<IrminAPIResponse | undefined>;
    pauseWorkflow: (
      _workflowId: number
    ) => Promise<IrminAPIResponse | undefined>;
    resumeWorkflow: (
      _workflowId: number
    ) => Promise<IrminAPIResponse | undefined>;
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
    createWorkspace: () => Promise.resolve({}),
    updateWorkspace: () => Promise.resolve({}),
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
  dataRepositories: {
    dataRepositories: [],
    isLoading: false,
    fetchDataRepositories: () => {},
    createDataRepository: () => Promise.resolve({}),
    updateDataRepository: () => Promise.resolve({}),
    deleteDataRepository: () => Promise.resolve({}),
    reassignDataRepository: () => Promise.resolve({}),
  },
  workflows: {
    workflowRuns: [],
    workflowRunsLoading: false,
    fetchWorkflowRuns: () => {},
    fetchWorkflowRunsByWorkflow: () => {},
    updateWorkflow: () => Promise.resolve({}),
    deleteWorkflow: () => Promise.resolve({}),
    pauseWorkflow: () => Promise.resolve({}),
    resumeWorkflow: () => Promise.resolve({}),
  },
});

/**
 * Hook to use the workspace context
 */
const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

/**
 * Provide entry point for the Workspace context
 */
export { useWorkspace, WorkspaceContext, WorkspaceProvider };
