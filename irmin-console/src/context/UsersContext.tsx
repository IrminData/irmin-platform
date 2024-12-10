'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import {
  cancelInvite,
  changeInviteRole,
  getInvites,
  resendInvite,
  sendInvite,
} from '@/lib/actions/invites';
import { changeUserRole, deleteUser, getUsers } from '@/lib/actions/users';

import WorkspaceSendInviteModalContent from '@/components/workspace/WorkspaceSendInviteModalContent';

import { Invite } from '@/types/core/Invite';
import { IrminRole } from '@/types/core/IrminRole';
import { User } from '@/types/core/User';

import { useLocale } from './LocaleContext';
import { usePopup } from './PopupContext';

/**
 * Users context properties
 */
interface UsersContextProps {
  roles: IrminRole[];
  users: User[];
  invites: Invite[];
  fetchUsers: () => void;
  fetchInvites: () => void;
  deleteUser: (userID: string) => Promise<void>;
  deleteInvite: (inviteID: string) => Promise<void>;
  changeUserRole: (userID: string, roles: string[]) => Promise<void>;
  changeInviteRole: (inviteID: string, role: string) => Promise<void>;
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
  roles: IrminRole[];
  currentUsers: User[];
  currentInvites: Invite[];
}) => {
  const { dict } = useLocale();
  const { irminAlert, irminModal } = usePopup();

  const updatingUsers = useRef(false);
  const [users, setUsers] = useState(currentUsers);

  const updatingInvites = useRef(false);
  const [invites, setInvites] = useState(currentInvites);

  const fetchUsers = useCallback(async () => {
    try {
      const newUsers = await getUsers();
      setUsers(newUsers);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the users'
      );
    }
  }, [irminAlert]);

  const fetchInvites = useCallback(async () => {
    try {
      const newInvites = await getInvites(currentWorkspace);
      setInvites(newInvites);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the invites'
      );
    }
  }, [irminAlert, currentWorkspace]);

  const handleDeleteUser = useCallback(
    async (userID: string) => {
      if (updatingUsers.current) return;
      try {
        updatingUsers.current = true;
        const res = await deleteUser(userID);
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
    [fetchUsers, irminAlert]
  );

  const handleDeleteInvite = useCallback(
    async (inviteID: string) => {
      if (updatingInvites.current) return;
      try {
        updatingInvites.current = true;
        const res = await cancelInvite(inviteID);
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
    [fetchInvites, irminAlert]
  );

  const handleChangeUserRole = useCallback(
    async (userID: string, roles: string[]) => {
      if (updatingUsers.current) return;
      try {
        updatingUsers.current = true;
        const res = await changeUserRole(userID, roles);
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
    [fetchUsers, irminAlert]
  );

  const handleChangeInviteRole = useCallback(
    async (inviteID: string, role: string) => {
      if (updatingInvites.current) return;
      try {
        updatingInvites.current = true;
        const res = await changeInviteRole(inviteID, role);
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
    [fetchInvites, irminAlert]
  );

  const handleResendInvite = useCallback(
    async (inviteID: string) => {
      try {
        const res = await resendInvite(inviteID);
        irminAlert('success', res.message ?? 'Invite resent successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error resending the invite'
        );
      }
    },
    [irminAlert]
  );

  const handleSendInvite = useCallback(async () => {
    irminModal.show(
      dict.users.inviteUser,
      <WorkspaceSendInviteModalContent
        irminRoles={roles}
        handleInvite={async (data: {
          firstName: string;
          lastName: string;
          email: string;
          phone: string;
          company: string;
          role: string;
        }) => {
          if (updatingInvites.current) return;
          try {
            updatingInvites.current = true;
            const res = await sendInvite(
              data.firstName,
              data.lastName,
              data.email,
              data.phone,
              data.company,
              data.role
            );
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
  }, [dict, roles, fetchInvites, irminModal, irminAlert]);

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
