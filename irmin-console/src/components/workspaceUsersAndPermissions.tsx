'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IoExit } from 'react-icons/io5';
import WorkspaceService from '@/lib/WorkspaceService';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Workspace, WorkspaceUser } from '@/types/Workspace';
import LoadingSpinner from './misc/LoadingSpinner';

const IrminRoles = [
  {
    id: 0,
    role: 'Admin',
    description:
      'Can manage the workspace, users, data jobs, data sets, queries, and integrations.',
  },
  {
    id: 1,
    role: 'Editor',
    description: 'Can manage data jobs, data sets, and integrations.',
  },
  {
    id: 2,
    role: 'Billing',
    description: 'Can manage billing for the workspace.',
  },
  {
    id: 3,
    role: 'Viewer',
    description: 'Can read data sets within the workspace.',
  },
];

const WorkspaceUsersAndPermissions: React.FC = () => {
  const { currentWorkspace, irminAlert, irminConfirm } = useWorkspace();
  const workspaceService = WorkspaceService.getInstance();
  const [users, setUsers] = useState<WorkspaceUser[]>([]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState(0);

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
        const invitedUsers = await workspaceService.getWorkspaceInvites(
          currentWorkspace.slug
        );
        for (const user of invitedUsers) {
          const invitedUser: WorkspaceUser = {
            id: workspaceUsers.length + 1,
            name: user.name,
            company: '',
            email: user.email,
            email_verified_at: null,
            created_at: user.created_at,
            updated_at: user.updated_at,
            inviteId: user.id,
            workspace: currentWorkspace,
            roles: [user.role.id],
          };
          workspaceUsers.push(invitedUser);
        }
        setUsers(workspaceUsers);
      } catch (error) {
        console.error('Error fetching users and roles:', error);
      }
    },
    [workspaceService]
  );

  useEffect(() => {
    fetchWorkspaceUsersAndRoles(currentWorkspace);
  }, [fetchWorkspaceUsersAndRoles, currentWorkspace]);

  const handleInvite = async () => {
    if (!currentWorkspace) return;
    // Check if user already inviteId
    if (users.find((user) => user.email === inviteEmail)) {
      irminAlert('error', 'User already inviteId');
      return;
    }
    try {
      // Invite user
      await workspaceService.inviteUserToWorkspace(
        currentWorkspace.slug,
        inviteEmail,
        inviteName,
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
      await workspaceService.resendUserInvite(
        typeof invitedUser.inviteId === 'number' ? invitedUser.inviteId : 1,
        invitedUser.email,
        invitedUser.name,
        invitedUser.company
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
      await workspaceService.cancelUserInvite(
        typeof invitedUser.inviteId === 'number' ? invitedUser.inviteId : 1
      );
      // Remove user from the list
      setUsers(users.filter((user) => user.email !== email));
    } catch (error: any) {
      console.error('Error canceling invite:', error);
      irminAlert('error', error.message ?? 'Error canceling invite');
    }
  };

  const handleRemoveUser = async (id: number, role: number) => {
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
              if (user.roles.length === 0) return { ...user, roles: [0] };
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
    oldRole: number,
    newRole: number
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
      setUsers(
        users.map((user) =>
          user.id === id ? { ...user, roles: [newRole] } : user
        )
      );
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
                {user.roles.length === 0 ? (
                  <p className='text-xs text-gray-700'>Owner</p>
                ) : (
                  <select
                    value={user.roles[0]}
                    onChange={(e) =>
                      handleChangeRole(
                        user.id,
                        user.roles[0],
                        parseInt(e.target.value)
                      )
                    }
                    className='rounded border p-1 text-xs text-gray-700'
                    disabled={typeof user.inviteId === 'number'}
                  >
                    {IrminRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role}
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
        <div className='absolute inset-0 flex h-screen items-center justify-center bg-gray-800 bg-opacity-50'>
          <div className='w-36 min-w-[30vw] rounded-lg bg-white p-8 shadow-lg'>
            <h2 className='mb-4 text-2xl font-semibold'>Invite user</h2>
            <div className='mb-4'>
              <label className='block text-gray-700'>Email</label>
              <input
                type='email'
                className='mt-2 w-full rounded border p-2'
                placeholder="Enter user's email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className='mb-4'>
              <label className='block text-gray-700'>Name</label>
              <input
                type='text'
                className='mt-2 w-full rounded border p-2'
                placeholder="Enter user's name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className='mb-4'>
              <label className='block text-gray-700'>Role</label>
              <select
                className='mt-2 w-full rounded border p-2'
                value={inviteRole}
                onChange={(e) => setInviteRole(parseInt(e.target.value))}
              >
                {IrminRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex justify-end'>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className='mr-4 rounded bg-gray-300 px-4 py-2 text-gray-700'
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className='rounded bg-ash_gray px-4 py-2 text-white'
              >
                Invite
              </button>
            </div>
            {inviteError && inviteError.length > 0 && (
              <p className='mt-4 text-red-800'>{inviteError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceUsersAndPermissions;
