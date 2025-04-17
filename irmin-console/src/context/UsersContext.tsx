'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import IrminCore from '@/lib/core';

import WorkspaceSendInviteModalContent from '@/components/workspace/WorkspaceSendInviteModalContent';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Invite } from '@/types/core/Invite';
import { IrminRole, Role } from '@/types/core/IrminRole';
import { User } from '@/types/core/User';

/**
 * Users context properties
 */
interface UsersContextProps {
  roles: Role[];
  users: User[];
  invites: Invite[];
  fetchUsers: () => void;
  fetchInvites: () => void;
  deleteUser: (userID: string) => Promise<void>;
  deleteInvite: (inviteID: string) => Promise<void>;
  changeUserRole: (userID: string, roles: IrminRole[]) => Promise<void>;
  changeInviteRole: (inviteID: string, role: IrminRole) => Promise<void>;
  resendInvite: (inviteID: string) => Promise<void>;
  sendInvite: () => void;
}

const UsersContext = createContext<UsersContextProps | undefined>(undefined);

/**
 * Users context for state management and interactions with the users and invites of the current workspace
 */
export const UsersProvider = ({
  children,
  currentWorkspace,
  roles,
  currentUsers,
  currentInvites,
}: {
  children: React.ReactNode;
  currentWorkspace: string;
  roles: Role[];
  currentUsers: User[];
  currentInvites: Invite[];
}) => {
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();
  const { irminAlert, irminModal } = usePopup();

  const updatingUsers = useRef(false);
  const [users, setUsers] = useState(currentUsers);

  const updatingInvites = useRef(false);
  const [invites, setInvites] = useState(currentInvites);

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const newUsers = await irminCore.userService.fetchWorkspaceUsers({
        workspace: currentWorkspace,
      });
      setUsers(newUsers.data ?? []);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the users'
      );
    }
  }, [irminAlert, currentWorkspace, getToken, locale]);

  const fetchInvites = useCallback(async () => {
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const newInvites = await irminCore.inviteService.listInvitesToWorkspace({
        workspace: currentWorkspace,
      });
      setInvites(newInvites.data ?? []);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the invites'
      );
    }
  }, [irminAlert, currentWorkspace, getToken, locale]);

  const handleDeleteUser = useCallback(
    async (userID: string) => {
      if (updatingUsers.current) return;
      try {
        updatingUsers.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.userService.removeUserFromWorkspace({
          workspace: currentWorkspace,
          user: userID,
        });
        await fetchUsers();
        irminAlert('success', res.message ?? 'User deleted successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error deleting the user'
        );
      } finally {
        updatingUsers.current = false;
      }
    },
    [fetchUsers, currentWorkspace, irminAlert, getToken, locale]
  );

  const handleDeleteInvite = useCallback(
    async (inviteID: string) => {
      if (updatingInvites.current) return;
      try {
        updatingInvites.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.inviteService.deleteInvite({ inviteID });
        await fetchInvites();
        irminAlert('success', res.message ?? 'Invite cancelled successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error cancelling the invite'
        );
      } finally {
        updatingInvites.current = false;
      }
    },
    [fetchInvites, irminAlert, getToken, locale]
  );

  const handleChangeUserRole = useCallback(
    async (userID: string, roles: IrminRole[]) => {
      if (updatingUsers.current) return;
      try {
        updatingUsers.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.userService.changeUserRole({
          workspace: currentWorkspace,
          user: userID,
          roles,
        });
        await fetchUsers();
        irminAlert('success', res.message ?? 'User role changed successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error changing the user role'
        );
      } finally {
        updatingUsers.current = false;
      }
    },
    [fetchUsers, currentWorkspace, irminAlert, getToken, locale]
  );

  const handleChangeInviteRole = useCallback(
    async (inviteID: string, role: IrminRole) => {
      if (updatingInvites.current) return;
      try {
        updatingInvites.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.inviteService.updateInvite({
          inviteID,
          role,
        });
        await fetchInvites();
        irminAlert(
          'success',
          res.message ?? 'Invite role changed successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error changing the invite role'
        );
      } finally {
        updatingInvites.current = false;
      }
    },
    [fetchInvites, irminAlert, getToken, locale]
  );

  const handleResendInvite = useCallback(
    async (inviteID: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.inviteService.resendInvite({ inviteID });
        irminAlert('success', res.message ?? 'Invite resent successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error resending the invite'
        );
      }
    },
    [irminAlert, getToken, locale]
  );

  const handleSendInvite = useCallback(async () => {
    irminModal.show(
      dict.users.inviteUser,
      <WorkspaceSendInviteModalContent
        roles={roles}
        handleInvite={async (data: { email: string; role: IrminRole }) => {
          if (updatingInvites.current) return;
          try {
            updatingInvites.current = true;
            const token = await getToken();
            const irminCore = new IrminCore(locale, token);
            const res = await irminCore.inviteService.sendInvite({
              workspace: currentWorkspace,
              email: data.email,
              role: data.role,
            });
            await fetchInvites();
            irminAlert('success', res.message ?? 'Invite sent successfully');
          } catch (error) {
            irminAlert(
              'error',
              (error as Error)?.message ?? 'Error sending the invite'
            );
          } finally {
            updatingInvites.current = false;
          }
        }}
        onClose={() => {
          irminModal.close();
        }}
      />
    );
  }, [
    dict,
    roles,
    currentWorkspace,
    fetchInvites,
    irminModal,
    irminAlert,
    getToken,
    locale,
  ]);

  return (
    <UsersContext.Provider
      value={{
        roles,
        users,
        invites,
        fetchUsers,
        fetchInvites,
        deleteUser: handleDeleteUser,
        deleteInvite: handleDeleteInvite,
        changeUserRole: handleChangeUserRole,
        changeInviteRole: handleChangeInviteRole,
        resendInvite: handleResendInvite,
        sendInvite: handleSendInvite,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

/**
 * Hook to use the users context
 */
export const useUsers = (): UsersContextProps => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
};
