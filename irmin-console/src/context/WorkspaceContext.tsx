'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import IrminCore from '@/lib/core';

import WorkspaceDeletionConfirmationModal from '@/components/workspace/WorkspaceDeletionConfirmationModal';

import { useConsoleSearchContext } from '@/context/ConsoleSearchContext';
import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Workspace } from '@/types/core/Workspace';
import { ConsoleSearchItem } from '@/types/internal/ConsoleSearch';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Workspace context properties
 */
interface WorkspaceContextProps {
  workspaceSlug: string;
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
  searchItems,
}: {
  children: React.ReactNode;
  workspaceSlug: string;
  initialWorkspace: Workspace | null;
  searchItems: ConsoleSearchItem[];
}) => {
  const { getToken } = useIAM();
  const router = useRouter();
  const { dict, locale } = useLocale();
  const { irminAlert, irminConfirm, irminModal } = usePopup();
  const { setSearchItems } = useConsoleSearchContext();

  // Track if the workspace is being updated
  const updating = useRef(false);

  // Active Workspace for the context
  const [workspace, setWorkspace] = useState(initialWorkspace);

  const fetchWorkspace = useCallback(async () => {
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const newWorkspace = await irminCore.workspaceService.fetchWorkspace({
        workspaceSlug,
      });
      if (!newWorkspace.data) return;
      setWorkspace(newWorkspace.data);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the workspace'
      );
    }
  }, [workspaceSlug, irminAlert, getToken, locale]);

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
            const token = await getToken();
            const irminCore = new IrminCore(locale, token);
            const res = await irminCore.workspaceService.deleteWorkspace({
              workspace: workspaceSlug,
            });
            irminAlert(
              'success',
              res.message ?? 'Workspace deleted successfully'
            );
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
  }, [workspaceSlug, dict, router, irminAlert, irminModal, getToken, locale]);

  const handleUpdateWorkspace = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.workspaceService.updateWorkspace({
          workspace: workspaceSlug,
          data: {
            name: data.name,
            description: data.description,
          },
        });
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
    [workspaceSlug, fetchWorkspace, irminAlert, getToken, locale]
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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.workspaceService.transferWorkspace({
          workspace: workspace.slug,
          newOwnerID: ownerID,
        });
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
    [
      workspace,
      dict,
      fetchWorkspace,
      irminAlert,
      irminConfirm,
      getToken,
      locale,
    ]
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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workspaceService.leaveWorkspace({
        workspaceSlug: workspace.slug,
      });
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
  }, [workspace, dict, irminAlert, irminConfirm, router, getToken, locale]);

  // Update the search items in the context when the workspace changes
  useEffect(() => {
    if (!workspace) return;
    const newSearchItems = searchItems.map((item) => ({
      ...item,
      workspace: workspace.name,
    }));
    setSearchItems(newSearchItems);
  }, [workspace, searchItems, setSearchItems]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceSlug,
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
