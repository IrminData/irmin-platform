'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { IoExit } from 'react-icons/io5';
import WorkspaceService from '@/lib/WorkspaceService';
import { useWorkspace } from '@/context/WorkspaceContext';
import { IrminRole, Workspace, WorkspaceUser } from '@/types/Workspace';
import LoadingSpinner from './misc/LoadingSpinner';
import InviteService from '@/lib/InviteService';
import { usePopup } from '@/context/PopupContext';
import Modal from './misc/Modal';

const WorkspaceUsersAndPermissions: React.FC = () => {
  const { currentWorkspace, irminRoles } = useWorkspace();
  const { irminAlert, irminConfirm } = usePopup();
  const workspaceService = WorkspaceService.getInstance();
  const inviteService = InviteService.getInstance();
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
        const workspaceUsers = await workspaceService.getWorkspaceUsers(
          currentWorkspace.slug
        );
        for (const user of workspaceUsers) {
          const userRoles = await workspaceService.getWorkspaceUserRole(
            currentWorkspace.slug,
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
        const invitedUsers = await inviteService.getInvites(
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
              irminRoles.find((role) => role.name === user.name) ??
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
      await inviteService.inviteUserToWorkspace(
        currentWorkspace.slug,
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
      irminAlert('success', 'Invite has been sent successfully');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      setInviteError(error.message ?? 'Error inviting user');
    }
  };

  const handleResend = async (email: string) => {
    if (!currentWorkspace) return;
    try {
      const invitedUser = users.find((user) => user.email === email);
      if (!invitedUser) return;
      // Resend invite
      await inviteService.resendUserInvite(
        typeof invitedUser.inviteId === 'number' ? invitedUser.inviteId : 1
      );
      // Inform that invite has been resent
      irminAlert('success', 'Invite resent');
    } catch (error: any) {
      console.error('Error resending invite:', error);
      irminAlert('error', error.message ?? 'Error resending invite');
    }
  };

  const handleCancelInvite = async (email: string) => {
    if (!currentWorkspace) return;
    try {
      const invitedUser = users.find((user) => user.email === email);
      if (!invitedUser) return;
      // Cancel invite
      await inviteService.cancelUserInvite(
        typeof invitedUser.inviteId === 'number' ? invitedUser.inviteId : 1
      );
      // Remove user from the list
      setUsers(users.filter((user) => user.email !== email));
    } catch (error: any) {
      console.error('Error canceling invite:', error);
      irminAlert('error', error.message ?? 'Error canceling invite');
    }
  };

  const handleRemoveUser = async (id: number, role: IrminRole) => {
    // Confirm removal
    irminConfirm(
      'info',
      'Are you sure you want to remove this user?',
      async () => {
        // Removal confirmed
        if (!currentWorkspace) return;
        try {
          // Remove user from workspace
          await workspaceService.removeUserFromWorkspace(
            currentWorkspace.slug,
            id,
            role
          );
          // Remove user from the list
          setUsers(users.filter((user) => user.id !== id));
        } catch (error: any) {
          console.error('Error changing user role:', error);
          irminAlert('error', error.message ?? 'Error removing user');
        }
      },
      () => {
        // Removal not confirmed
      }
    );
  };

  const handleTransferOwnership = (id: number) => {
    // Confirm transfer
    irminConfirm(
      'info',
      'Are you sure you want to transfer ownership?',
      () => {
        // Transfer confirmed
        if (!currentWorkspace) return;
        try {
          // Transfer ownership
          workspaceService.transferWorkspaceOwnership(
            currentWorkspace.slug,
            id
          );
          // Update the local state of workspace users
          setUsers(
            users.map((user) => {
              if (user.id === id) return { ...user, roles: [] };
              if (user.roles.length === 0)
                return { ...user, roles: [irminRoles[0]] };
              return user;
            })
          );
        } catch (error: any) {
          console.error('Error transferring ownership:', error);
          irminAlert('error', error.message ?? 'Error transferring ownership');
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
    if (!currentWorkspace) return;
    try {
      // Change user role
      await workspaceService.changeUserWorkspaceRole(
        currentWorkspace.slug,
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
    } catch (error: any) {
      console.error('Error changing user role:', error);
      irminAlert('error', error.message ?? 'Error changing user role');
    }
  };

  if (!currentWorkspace || users.length === 0) return <LoadingSpinner />;

  return (
    <div>
      <div className='flex flex-row justify-between'>
        <h2 className='mb-4 text-2xl font-normal'>Users & Permissions</h2>
        <button
          className='mb-4 cursor-pointer rounded bg-ash_gray px-4 py-2 text-white transition-all hover:bg-ash_gray-800'
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invite User
        </button>
      </div>
      <table className='min-w-full bg-white'>
        <thead>
          <tr>
            <th className='border-b px-4 py-2 text-left font-normal'>Name</th>
            <th className='border-b px-4 py-2 text-left font-normal'>Email</th>
            <th className='border-b px-4 py-2 text-left font-normal'>Role</th>
            <th className='border-b px-4 py-2 text-right font-normal'>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className='border-b px-4 py-2 text-xs text-gray-700'>
                {user.name}
              </td>
              <td className='border-b px-4 py-2 text-xs text-gray-700'>
                {user.email}
                {user.inviteId && (
                  <span className='ml-2 text-xs text-gray-400'>Invited</span>
                )}
              </td>
              <td className='border-b px-4 py-2'>
                {currentWorkspace.owner_id === user.id ? (
                  <p className='text-xs text-gray-700'>Owner</p>
                ) : (
                  <select
                    value={user.roles.length === 0 ? -1 : user.roles[0].id}
                    onChange={(e) =>
                      handleChangeRole(
                        user.id,
                        user.roles[0] ?? null,
                        irminRoles.find(
                          (role) => role.id === parseInt(e.target.value)
                        )!
                      )
                    }
                    className='rounded border p-1 text-xs text-gray-700'
                    disabled={typeof user.inviteId === 'number'}
                  >
                    <option disabled value={-1}>
                      No role
                    </option>
                    {irminRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td className='border-b px-4 py-2 text-right'>
                {user.roles.length !== 0 && !user.inviteId && (
                  <>
                    <button
                      className='mr-2 rounded px-3 py-1 text-xs text-gray-800 transition-all hover:text-gray-500 hover:underline'
                      onClick={() => handleTransferOwnership(user.id)}
                    >
                      Transfer ownership
                    </button>
                    <button
                      className='rounded px-3 py-1 text-gray-800 transition-all hover:bg-gray-500 hover:text-white'
                      onClick={() => handleRemoveUser(user.id, user.roles[0])}
                    >
                      <IoExit />
                    </button>
                  </>
                )}
                {user.inviteId && (
                  <>
                    <button
                      className='rounded px-3 py-1 text-xs text-gray-800 transition-all hover:text-gray-500 hover:underline'
                      onClick={() => handleResend(user.email)}
                    >
                      Resend invite
                    </button>
                    <button
                      className='rounded px-3 py-1 text-gray-800 transition-all hover:bg-gray-500 hover:text-white'
                      onClick={() => handleCancelInvite(user.email)}
                    >
                      <IoExit />
                    </button>
                  </>
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
            <label className='block text-gray-700'>Name</label>
            <input
              type='text'
              className='mt-2 w-full rounded border p-2'
              placeholder='John Doe'
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
          </div>
          <div className='mb-4'>
            <label className='block text-gray-700'>Email</label>
            <input
              type='email'
              className='mt-2 w-full rounded border p-2'
              placeholder='johndoe@example.com'
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className='mb-4'>
            <label className='block text-gray-700'>Role</label>
            <select
              className='mt-2 w-full rounded border p-2'
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
          <div className='flex justify-end'>
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className='mr-4 cursor-pointer rounded bg-gray-300 px-4 py-2 text-gray-700 transition-all hover:bg-gray-400'
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              className='cursor-pointer rounded bg-ash_gray px-4 py-2 text-white transition-all hover:bg-ash_gray-400'
            >
              Invite
            </button>
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
