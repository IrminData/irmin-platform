'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Workspace, WorkspaceAPIResponse } from '@/types/Workspace';
import Alert from '@/components/misc/Alert';
import ConfirmPopup from '@/components/misc/ConfirmPopup';

const WorkspaceContext = createContext<{
  workspaces: Workspace[] | null;
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  fetchWorkspaces: () => void;
  irminAlert: (type: 'success' | 'error' | 'info', message: string) => void;
  irminConfirm: (
    type: 'success' | 'error' | 'info',
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;
}>({
  workspaces: null,
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  fetchWorkspaces: () => {},
  irminAlert: () => {},
  irminConfirm: () => {},
});

const fetchWorkspacesData = async (): Promise<WorkspaceAPIResponse> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? ''}/v1/workspaces`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch workspaces');
  }

  return response.json();
};

export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );

  // Fetch the workspaces data
  const fetchWorkspaces = async () => {
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      const offlineWorkspace: Workspace = {
        id: 0,
        name: 'Offline workspace',
        slug: 'offline-workspace',
      };
      setWorkspaces([offlineWorkspace]);
      setCurrentWorkspace(offlineWorkspace);
      return;
    }
    try {
      const data = await fetchWorkspacesData();
      if (Array.isArray(data.data)) {
        setWorkspaces(data.data);
      } else {
        setWorkspaces(null);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setWorkspaces(null);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Handle alerts
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<
    'success' | 'error' | 'info' | null
  >(null);
  const irminAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertType(type);
    setAlertMessage(message);
    setTimeout(() => {
      setAlertType(null);
      setAlertMessage(null);
    }, 5000);
  };

  // Handle confirmations
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<
    'success' | 'error' | 'info' | null
  >(null);
  const [confirmSuccess, setConfirmSuccess] = useState<(() => void) | null>(
    null
  );
  const [confirmCancel, setConfirmCancel] = useState<(() => void) | null>(null);
  const irminConfirm = (
    type: 'success' | 'error' | 'info',
    message: string,
    confirmSuccess: () => void,
    confirmCancel: () => void
  ) => {
    setConfirmType(type);
    setConfirmMessage(message);
    setConfirmSuccess(confirmSuccess);
    setConfirmCancel(confirmCancel);
    setTimeout(() => {
      setConfirmType(null);
      setConfirmMessage(null);
      setConfirmSuccess(null);
      setConfirmCancel(null);
    }, 10000);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        fetchWorkspaces,
        irminAlert: irminAlert,
        irminConfirm: irminConfirm,
      }}
    >
      {children}
      {alertMessage && alertType && (
        <Alert
          type={alertType}
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
      {confirmMessage && confirmType && confirmSuccess && confirmCancel && (
        <ConfirmPopup
          type={confirmType}
          message={confirmMessage}
          onConfirm={() => {
            confirmSuccess();
            setConfirmMessage(null);
          }}
          onCancel={() => {
            confirmCancel();
            setConfirmMessage(null);
          }}
        />
      )}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
