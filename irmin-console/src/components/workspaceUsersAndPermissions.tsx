'use client';

import React, { useCallback, useEffect, useState } from 'react';

import InviteService from '@/lib/api/InviteService';
import WorkspaceService from '@/lib/api/WorkspaceService';

import { IoExit, IoKey, IoMailOpenOutline } from 'react-icons/io5';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSpinner from '@/components/misc/LoadingSpinner';
import Modal from '@/components/misc/Modal';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { IrminRole, Workspace, WorkspaceUser } from '@/types/Workspace';

const WorkspaceUsersAndPermissions: React.FC = () => {
  const { locale, dict } = useLocale();
  const { currentWorkspace, irminRoles, switchToWorkspace } = useWorkspace();
  const { irminAlert, irminConfirm } = usePopup();
  const workspaceService = WorkspaceService.getInstance(locale);
  const inviteService = InviteService.getInstance(locale);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<number | null>(null);

  const fetchWorkspaceUsersAndRoles = useCallback(
    async (currentWorkspace: Workspace | null) => {
      if (!currentWorkspace) return;
      try {
        // Fetch workspace users and their roles
        const workspaceUsers = await workspaceService.getWorkspaceUsers();
        for (const user of workspaceUsers) {
          const userRoles = await workspaceService.getWorkspaceUserRoles(
            user.id
          );
          if (userRoles) {
            user.inviteId = false;
            user.roles = userRoles;
          } else {
            // User not found in workspace
            workspaceUsers.splice(workspaceUsers.indexOf(user), 1);
          }
        }
        // Also fetch users that have been invited but not yet accepted
        const invitedUsers = await inviteService.getInvitesByWorkspace(
          currentWorkspace.slug
        );
        for (const user of invitedUsers) {
          const invitedUser: WorkspaceUser = {
            id: Math.max(...workspaceUsers.map((a) => a.id)) + 1,
            name: user.name,
            company: '',
            email: user.email,
            email_verified_at: null,
            created_at: user.created_at,
            updated_at: user.updated_at,
            inviteId: user.id,
            workspace: currentWorkspace,
            roles: [
              irminRoles.find((role) => role.name === user.role.name) ??
                irminRoles[0],
            ],
          };
          workspaceUsers.push(invitedUser);
        }
        setUsers(workspaceUsers);
      } catch (error) {
        console.error('Error fetching users and roles:', error);
      }
    },
    [workspaceService, inviteService, irminRoles]
  );

  useEffect(() => {
    fetchWorkspaceUsersAndRoles(currentWorkspace);
  }, [fetchWorkspaceUsersAndRoles, currentWorkspace]);

  useEffect(() => {
    setInviteRole(irminRoles[0].id);
  }, [irminRoles]);

  const handleInvite = async () => {
    // Validate invite data
    if (!currentWorkspace || !inviteRole) {
      irminAlert('error', 'Invalid invite data');
      return;
    }
    try {
      // Invite user
      const res = await inviteService.inviteUserToWorkspace(
        inviteName,
        inviteEmail,
        inviteRole
      );
      fetchWorkspaceUsersAndRoles(currentWorkspace);
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
    if (!currentWorkspace) return;
    try {
      const invitedUser = users.find((user) => user.email === email);
      if (!invitedUser) return;
      // Resend invite
      const res = await inviteService.resendUserInvite(
        typeof invitedUser.inviteId === 'number' ? invitedUser.inviteId : 1
      );
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
      if (!invitedUser) return;
      // Cancel invite
      const res = await inviteService.cancelUserInvite(
        typeof invitedUser.inviteId === 'number' ? invitedUser.inviteId : 1
      );
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
      async () => {
        // Removal confirmed
        try {
          // Remove user from workspace
          const res = await workspaceService.removeUserFromWorkspace(id);
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
      },
      () => {
        // Removal not confirmed
      }
    );
  };

  const handleTransferOwnership = async (id: number) => {
    // Confirm transfer
    irminConfirm(
      'info',
      dict.usersPermissions.transferOwnershipConfirmation,
      async () => {
        // Transfer confirmed
        if (!currentWorkspace) return;
        try {
          // Transfer ownership
          const res = await workspaceService.transferWorkspaceOwnership(id);
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
      },
      () => {
        // Transfer not confirmed
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
      const res = await workspaceService.changeUserWorkspaceRole(
        id,
        newRole,
        oldRole
      );
      // Update the local state of workspace users
      const newUsers = users.map((user) => {
        if (user.id === id) {
          return {
            ...user,
            roles: [
              irminRoles.find((a) => a.id === newRole.id) ?? irminRoles[0],
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
      const res = await inviteService.changeUserInviteRole(inviteId, newRole);
      // Update the local state of workspace users
      const newUsers = users.map((user) => {
        if (user.inviteId === inviteId) {
          return {
            ...user,
            roles: [
              irminRoles.find((a) => a.id === newRole.id) ?? irminRoles[0],
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
            <th className='hidden border-b px-4 py-2 text-left text-xs font-normal text-irmin_black md:text-sm lg:table-cell'>
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
              <td className='border-b px-4 py-2 text-xs text-gray-700'>
                {user.name}
                <span className='block text-[8px] leading-[8px] text-gray-400 lg:hidden'>
                  {user.email}
                </span>
                {user.inviteId && (
                  <span className='block text-[8px] leading-[8px] text-gray-400 lg:hidden'>
                    {dict.usersPermissions.invited}
                  </span>
                )}
              </td>
              <td className='hidden border-b px-4 py-2 text-xs text-gray-700 lg:table-cell'>
                {user.email}
                {user.inviteId && (
                  <span className='ml-2 text-xs text-gray-400'>
                    {dict.usersPermissions.invited}
                  </span>
                )}
              </td>
              <td className='border-b px-4 py-2'>
                {currentWorkspace.owner_id === user.id ? (
                  <p className='text-xs text-gray-700'>
                    {dict.usersPermissions.owner}
                  </p>
                ) : (
                  <select
                    value={
                      user.roles.length === 0 ? 'no-role' : user.roles[0].id
                    }
                    onChange={(e) => {
                      const desiredRole = irminRoles.find(
                        (role) => role.id === parseInt(e.target.value)
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
                          user.roles[0] ?? null,
                          desiredRole
                        );
                      }
                    }}
                    className='rounded-lg border p-1 text-xs text-gray-700'
                  >
                    <option value={'no-role'}>
                      {dict.usersPermissions.noRole}
                    </option>
                    {irminRoles.map((role, i) => (
                      <option
                        key={`role-option-${role.id}-${i}`}
                        value={role.id}
                      >
                        {role.label}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td className='border-b px-4 py-2 text-right'>
                {user.roles.length !== 0 && !user.inviteId && (
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
            </tr>
          ))}
        </tbody>
      </table>

      {isInviteModalOpen && (
        <Modal
          isOpen={isInviteModalOpen}
          title='Invite a User'
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
              value={inviteRole ?? irminRoles[0].id}
              onChange={(e) => setInviteRole(parseInt(e.target.value))}
            >
              {irminRoles.map((role) => (
                <option key={role.id} value={role.id}>
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
              ariaLabel='Close the modal window'
              onClick={() => setIsInviteModalOpen(false)}
              className='w-1/2'
            >
              {dict.usersPermissions.cancel}
            </Button>
            <Button
              size='md'
              variant='solid'
              colorScheme='primary'
              ariaLabel='Send an invite to the user'
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
