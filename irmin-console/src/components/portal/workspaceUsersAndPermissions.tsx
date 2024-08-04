'use client';

import React, { useEffect, useState } from 'react';

import { IoExit, IoKey, IoMailOpenOutline } from 'react-icons/io5';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSpinner from '@/components/misc/LoadingSpinner';
import Modal from '@/components/misc/Modal';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * Type for a workspace user used by this component.
 * This way we are able to unify the data structure for both regular users and invited users
 */
type WorkspaceUsersAndPermissionsUser = {
  inviteId?: number;
} & WorkspaceUser;

/**
 * Workspace users and permissions UI
 *
 * @remarks
 *
 * This component is used to display the list of users and their permissions in the workspace.
 *
 * It allows to manage the users and their roles in the workspace.
 * It includes the ability to invite new users, change roles, and remove users from the workspace.
 *
 * This component shows both regular users and invited users that have not yet accepted the invite as
 * entities on the list. Invites and Users are converted to {@link WorkspaceUsersAndPermissionsUser} type.
 */
const WorkspaceUsersAndPermissions: React.FC = () => {
  const { dict } = useLocale();
  const {
    workspaces: { currentWorkspace, switchToWorkspace, transferOwnership },
    irminRoles,
    users: { users: workspaceUsers, deleteUser, changeUserRole },
    invites: {
      invites: workspaceInvites,
      sendInvite,
      resendInvite,
      cancelInvite,
      changeInvite,
    },
  } = useWorkspace();
  const { irminAlert, irminConfirm } = usePopup();

  const [users, setUsers] = useState<WorkspaceUsersAndPermissionsUser[]>([]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<IrminRoleNames | null>(null);

  /**
   * Hook to format the workspace users and invites in to a unified state
   */
  useEffect(() => {
    // Make sure we have the current workspace
    if (!currentWorkspace) return;
    // Set users state for the component
    setUsers([
      ...workspaceUsers.map((user) => ({
        ...user,
        inviteId: undefined,
      })),
      ...workspaceInvites.map(
        (invite, inviteCount) =>
          ({
            id:
              Math.max(...workspaceUsers.map((a) => a.id)) + (inviteCount + 1),
            name: invite.name,
            email: invite.email,
            inviteId: invite.id,
            roles: [
              irminRoles.find((role) => role.name === invite.role.name) ??
                irminRoles[0],
            ],
          }) as WorkspaceUsersAndPermissionsUser
      ),
    ]);
  }, [currentWorkspace, workspaceUsers, workspaceInvites, irminRoles]);

  /**
   * Hook to preselect the first role in the list of roles for the invite form
   */
  useEffect(() => {
    if (inviteRole) return;
    setInviteRole(irminRoles[0].name);
  }, [inviteRole, irminRoles]);

  const handleInvite = async () => {
    try {
      if (!inviteRole) return;
      // Invite the user
      const res = await sendInvite(inviteName, inviteEmail, inviteRole);
      // Reset form
      setInviteEmail('');
      setInviteName('');
      setIsInviteModalOpen(false);
      // Inform that invite has been sent
      irminAlert(
        'success',
        res.metadata?.message ?? 'Invite sent successfully'
      );
    } catch (error) {
      console.error('Error inviting user:', error);
      setInviteError((error as Error)?.message ?? 'Error inviting user');
    }
  };

  const handleResend = async (email: string) => {
    try {
      const invitedUser = users.find((user) => user.email === email);
      if (!invitedUser || typeof invitedUser.inviteId !== 'number') return;
      // Resend invite
      const res = await resendInvite(invitedUser.inviteId);
      // Inform that invite has been resent
      irminAlert(
        'success',
        res.metadata?.message ?? 'Invite resent successfully'
      );
    } catch (error) {
      console.error('Error resending invite:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error resending invite'
      );
    }
  };

  const handleCancelInvite = async (email: string) => {
    if (!currentWorkspace) return;
    try {
      const invitedUser = users.find((user) => user.email === email);
      if (!invitedUser || typeof invitedUser.inviteId !== 'number') return;
      // Cancel invite
      const res = await cancelInvite(invitedUser.inviteId);
      // Remove user from the list
      setUsers(users.filter((user) => user.email !== email));
      irminAlert(
        'success',
        res.metadata?.message ?? 'Invite canceled successfully'
      );
    } catch (error) {
      console.error('Error canceling invite:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error canceling invite'
      );
    }
  };

  const handleRemoveUser = async (id: number) => {
    // Confirm removal
    irminConfirm(
      'info',
      dict.usersPermissions.removeUserConfirmation,
      async (confirmed) => {
        if (confirmed) {
          // Removal confirmed
          try {
            // Remove user from workspace
            const res = await deleteUser(id);
            // Remove user from the list
            setUsers(users.filter((user) => user.id !== id));
            irminAlert(
              'success',
              res.metadata?.message ??
                'User removed successfully from the workspace'
            );
          } catch (error) {
            console.error('Error changing user role:', error);
            irminAlert(
              'error',
              (error as Error)?.message ?? 'Error removing user'
            );
          }
        }
      }
    );
  };

  const handleTransferOwnership = async (id: number) => {
    // Confirm transfer
    irminConfirm(
      'warning',
      dict.usersPermissions.transferOwnershipConfirmation,
      async (confirmed) => {
        if (confirmed) {
          // Transfer confirmed
          if (!currentWorkspace) return;
          try {
            // Transfer ownership
            const res = await transferOwnership(id);
            // Refetch the current workspace
            switchToWorkspace(currentWorkspace.slug);
            // Inform that ownership has been transferred
            irminAlert(
              'success',
              res.metadata?.message ?? 'Ownership transfered successfully'
            );
          } catch (error) {
            console.error('Error transferring ownership:', error);
            irminAlert(
              'error',
              (error as Error)?.message ?? 'Error transferring ownership'
            );
          }
        }
      }
    );
  };

  const handleChangeRole = async (
    id: number,
    oldRole: IrminRole | null,
    newRole: IrminRole
  ) => {
    try {
      // Change user role
      const res = await changeUserRole(id, newRole.name);
      // Update the local state of workspace users
      const newUsers = users.map((user) => {
        if (user.id === id) {
          return {
            ...user,
            roles: [
              irminRoles.find((a) => a.name === newRole.name) ?? irminRoles[0],
            ],
          };
        }
        return user;
      });
      setUsers(newUsers);
      irminAlert(
        'success',
        res.metadata?.message ?? 'User role changed successfully'
      );
    } catch (error) {
      console.error('Error changing user role:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error changing user role'
      );
    }
  };

  const handleChangeInviteRole = async (
    inviteId: number,
    newRole: IrminRole
  ) => {
    try {
      // Change invite role
      const res = await changeInvite(inviteId, newRole);
      // Update the local state of workspace users
      const newUsers = users.map((user) => {
        if (user.inviteId === inviteId) {
          return {
            ...user,
            roles: [
              irminRoles.find((a) => a.name === newRole.name) ?? irminRoles[0],
            ],
          };
        }
        return user;
      });
      setUsers(newUsers);
      // Inform that invite role has been changed
      irminAlert(
        'success',
        res.metadata?.message ?? 'Invite role changed successfully'
      );
    } catch (error) {
      console.error('Error changing user role:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error changing user role'
      );
    }
  };

  if (!currentWorkspace || users.length === 0) return <LoadingSpinner />;

  return (
    <div className=''>
      <div className='mb-4 flex flex-row items-center justify-between px-4'>
        <h2 className='text-base md:text-xl xl:text-2xl'>
          {dict.usersPermissions.usersAndPermissions}
        </h2>
        <Button
          size='sm'
          variant='solid'
          colorScheme='primary'
          onClick={() => setIsInviteModalOpen(true)}
        >
          {dict.usersPermissions.inviteUser}
        </Button>
      </div>
      <table className='min-w-full bg-white'>
        <thead>
          <tr>
            <th className='border-b px-4 py-2 text-left text-xs font-normal text-irmin_black md:text-sm'>
              {dict.usersPermissions.name}
            </th>
            <th className='hidden border-b px-4 py-2 text-left text-sm font-normal text-irmin_black md:table-cell'>
              {dict.usersPermissions.email}
            </th>
            <th className='border-b px-4 py-2 text-left text-xs font-normal text-irmin_black md:text-sm'>
              {dict.usersPermissions.role}
            </th>
            <th className='border-b px-4 py-2 text-center text-xs font-normal text-irmin_black md:text-right md:text-sm'>
              {/* Actions */}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr key={`workspace-user-${user.id}-${idx}`}>
              <td className='border-b px-4 py-2 text-sm text-gray-700'>
                {user.name}
                {/* Only for mobile screens */}
                <span className='block text-xs text-gray-400 md:hidden'>
                  {user.email}
                </span>
                {user.inviteId && (
                  <span className='block text-xs text-gray-400 md:hidden'>
                    {dict.usersPermissions.invited}
                  </span>
                )}
              </td>
              {/* Only for larger screens */}
              <td className='hidden border-b px-4 py-2 text-sm text-gray-700 md:table-cell'>
                {user.email}
                {user.inviteId && (
                  <span className='ml-2 text-xs text-gray-400'>
                    {dict.usersPermissions.invited}
                  </span>
                )}
              </td>
              <td className='border-b px-4 py-2'>
                {currentWorkspace.owner_id === user.id ? (
                  <p className='text-sm text-gray-700'>
                    {dict.usersPermissions.owner}
                  </p>
                ) : (
                  <select
                    value={
                      !user.roles || user.roles.length === 0
                        ? 'no-role'
                        : user.roles[0].name
                    }
                    onChange={(e) => {
                      const desiredRole = irminRoles.find(
                        (role) => role.name === e.target.value
                      )!;
                      if (!desiredRole || e.target.value === 'no-role') {
                        irminAlert('error', 'Invalid role');
                        return;
                      }
                      if (typeof user.inviteId === 'number') {
                        // Change role of an invited user
                        handleChangeInviteRole(user.inviteId, desiredRole);
                      } else {
                        // Change role of a regular user
                        handleChangeRole(
                          user.id,
                          user.roles && user.roles.length > 0
                            ? user.roles[0]
                            : null,
                          desiredRole
                        );
                      }
                    }}
                    className='rounded-lg border p-1 text-sm text-gray-700'
                  >
                    <option value={'no-role'}>
                      {dict.usersPermissions.noRole}
                    </option>
                    {irminRoles.map((role, i) => (
                      <option
                        key={`role-option-${role.name}-${i}`}
                        value={role.name}
                      >
                        {role.label}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              {currentWorkspace.owner_id !== user.id ? (
                <td className='border-b px-4 py-2 text-right'>
                  {user.roles && user.roles.length > 0 && !user.inviteId && (
                    <div className='flex flex-row justify-end gap-2 align-middle'>
                      <Button
                        size='sm'
                        variant='outline'
                        colorScheme='gray'
                        aria-label='Transfer ownership to user'
                        onClick={() => handleTransferOwnership(user.id)}
                        icon={<IoKey size={24} />}
                      >
                        {dict.usersPermissions.transferOwnership}
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        colorScheme='gray'
                        aria-label='Remove user from workspace'
                        onClick={() => handleRemoveUser(user.id)}
                        icon={<IoExit size={24} />}
                      >
                        {dict.usersPermissions.removeFromWorkspace}
                      </Button>
                    </div>
                  )}
                  {user.inviteId && (
                    <div className='flex flex-row justify-end gap-2 align-middle'>
                      <Button
                        size='sm'
                        variant='outline'
                        colorScheme='gray'
                        aria-label='Resend invite'
                        icon={<IoMailOpenOutline size={24} />}
                        onClick={() => handleResend(user.email)}
                      >
                        {dict.usersPermissions.resendInvite}
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        colorScheme='gray'
                        aria-label='Cancel invite'
                        icon={<IoExit size={24} />}
                        onClick={() => handleCancelInvite(user.email)}
                      >
                        {dict.usersPermissions.cancelInvite}
                      </Button>
                    </div>
                  )}
                </td>
              ) : (
                <td className='border-b px-4 py-2 text-right'></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isInviteModalOpen && (
        <Modal
          isOpen={isInviteModalOpen}
          title={dict.usersPermissions.inviteUser}
          onClose={() => setIsInviteModalOpen(false)}
        >
          <div className='mb-4'>
            <label className='block text-gray-700'>
              {dict.usersPermissions.name}
            </label>
            <Input
              variant='solid'
              colorScheme='black'
              className='mt-2 w-full'
              type='text'
              placeholder='John Doe'
              defaultValue={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
          </div>
          <div className='mb-4'>
            <label className='block text-gray-700'>
              {dict.usersPermissions.email}
            </label>
            <Input
              variant='solid'
              colorScheme='black'
              className='mt-2 w-full'
              type='email'
              placeholder='johndoe@example.com'
              defaultValue={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className='mb-4'>
            <label className='block text-gray-700'>
              {dict.usersPermissions.role}
            </label>
            <select
              className='mt-2 w-full rounded-lg border p-2'
              value={inviteRole ?? irminRoles[0]?.name ?? null}
              onChange={(e) => setInviteRole(e.target.value as IrminRoleNames)}
            >
              {irminRoles.map((role) => (
                <option key={role.name} value={role.name}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className='flex justify-end gap-2'>
            <Button
              size='md'
              variant='outline'
              colorScheme='gray'
              onClick={() => setIsInviteModalOpen(false)}
              className='w-1/2'
            >
              {dict.usersPermissions.cancel}
            </Button>
            <Button
              size='md'
              variant='solid'
              colorScheme='primary'
              onClick={handleInvite}
              className='w-1/2'
            >
              {dict.usersPermissions.invite}
            </Button>
          </div>
          {inviteError && inviteError.length > 0 && (
            <p className='mt-4 text-red-800'>{inviteError}</p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default WorkspaceUsersAndPermissions;
