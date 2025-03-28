'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  deleteWorkspace,
  getWorkspace,
  leaveWorkspace,
  switchWorkspace,
  transferWorkspace,
  updateWorkspace,
} from '@/lib/actions/workspaces';

import WorkspaceDeletionConfirmationModal from '@/components/workspace/WorkspaceDeletionConfirmationModal';

import { Workspace } from '@/types/core/Workspace';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

import { useLocale } from './LocaleContext';
import { usePopup } from './PopupContext';

/**
 * Workspace context properties
 */
interface WorkspaceContextProps {
  workspace: Workspace | null;
  fetchWorkspace: () => Promise<void>;
  deleteWorkspace: () => Promise<void>;
  updateWorkspace: (data: ItemUpdateProps) => Promise<void>;
  transferWorkspace: (ownerID: string) => Promise<void>;
  leaveWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(
  undefined
);

/**
 * Workspace context for state management and interactions with workspaces of the workspace
 */
export const WorkspaceProvider = ({
  children,
  workspaceSlug,
  initialWorkspace,
}: {
  children: React.ReactNode;
  workspaceSlug: string;
  initialWorkspace: Workspace | null;
}) => {
  const router = useRouter();
  const { dict } = useLocale();
  const { irminAlert, irminConfirm, irminModal } = usePopup();

  // Track if the workspace is being updated
  const updating = useRef(false);

  // Active Workspace for the context
  const [workspace, setWorkspace] = useState(initialWorkspace);

  const fetchWorkspace = useCallback(async () => {
    try {
      const newWorkspace = await getWorkspace(workspaceSlug);
      if (!newWorkspace) return;
      setWorkspace(newWorkspace);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the workspace'
      );
    }
  }, [workspaceSlug, irminAlert]);

  const handleDeleteWorkspace = useCallback(async () => {
    irminModal.show(
      dict.list.delete,
      <WorkspaceDeletionConfirmationModal
        dict={dict}
        close={irminModal.close}
        handleDelete={async () => {
          if (updating.current) return;
          try {
            updating.current = true;
            const res = await deleteWorkspace(workspaceSlug);
            irminAlert(
              'success',
              res.message ?? 'Workspace deleted successfully'
            );
            await switchWorkspace();
            router.push('/workspace');
          } catch (error) {
            irminAlert(
              'error',
              (error as Error)?.message ?? 'Error deleting the workspace'
            );
          } finally {
            updating.current = false;
          }
        }}
      />
    );
  }, [workspaceSlug, dict, router, irminAlert, irminModal]);

  const handleUpdateWorkspace = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const res = await updateWorkspace(workspaceSlug, data);
        await fetchWorkspace();
        irminAlert('success', res.message ?? 'Workspace updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error updating the workspace'
        );
      } finally {
        updating.current = false;
      }
    },
    [workspaceSlug, fetchWorkspace, irminAlert]
  );

  const handleTransferOwnershipWorkspace = useCallback(
    async (ownerID: string) => {
      if (!workspace) return;
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToTransferOwnership} (${workspace.name})`
      );
      if (updating.current || !confirmed) return;
      try {
        updating.current = true;
        const res = await transferWorkspace(workspace.slug, ownerID);
        await fetchWorkspace();
        irminAlert(
          'success',
          res.message ?? 'Workspace transfered successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error transfering the workspace'
        );
      } finally {
        updating.current = false;
      }
    },
    [workspace, dict, fetchWorkspace, irminAlert, irminConfirm]
  );

  const handleLeaveWorkspace = useCallback(async () => {
    if (!workspace) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.workspaceSwitcher.leaveWorkspaceConfirm} (${workspace.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const res = await leaveWorkspace();
      router.push('/workspace');
      irminAlert('success', res.message ?? 'You have left the workspace');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error leaving the workspace'
      );
    } finally {
      updating.current = false;
    }
  }, [workspace, dict, irminAlert, irminConfirm, router]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        fetchWorkspace,
        deleteWorkspace: handleDeleteWorkspace,
        updateWorkspace: handleUpdateWorkspace,
        transferWorkspace: handleTransferOwnershipWorkspace,
        leaveWorkspace: handleLeaveWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

/**
 * Hook to use the workspace context
 */
export const useWorkspace = (): WorkspaceContextProps => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
