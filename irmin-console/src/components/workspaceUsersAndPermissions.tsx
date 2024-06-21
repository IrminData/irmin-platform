'use client';

import React, { useState } from 'react';
import { IoExit } from 'react-icons/io5';

const IrminRoles = ['Owner', 'Admin', 'Editor', 'Viewer', 'Billing'];

const WorkspaceUsersAndPermissions: React.FC = () => {
  const [users, setUsers] = useState([
    {
      id: 0,
      email: 'user_owner@example.com',
      role: 'Owner',
      invite_accepted: true,
    },
    { id: 1, email: 'user1@example.com', role: 'Admin', invite_accepted: true },
    {
      id: 2,
      email: 'user2@example.com',
      role: 'Editor',
      invite_accepted: true,
    },
    {
      id: 3,
      email: 'user3@example.com',
      role: 'Viewer',
      invite_accepted: false,
    },
  ]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');

  const handleInvite = () => {
    // Check if user already invited
    if (users.find((user) => user.email === inviteEmail)) {
      alert('User already invited');
      return;
    }
    // Invite user
    setUsers([
      ...users,
      {
        id: Date.now(),
        email: inviteEmail,
        role: inviteRole,
        invite_accepted: false,
      },
    ]);
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  const handleRemoveUser = (id: number) => {
    // Confirm removal
    if (!confirm('Are you sure you want to remove this user?')) {
      return;
    }
    // Remove user from the list
    setUsers(users.filter((user) => user.id !== id));
  };

  const handleTransferOwnership = (id: number) => {
    // Confirm transfer
    if (!confirm('Are you sure you want to transfer ownership?')) {
      return;
    }
    // Transfer ownership
    setUsers(
      users
        .map((user) =>
          user.role === 'Owner' ? { ...user, role: 'Admin' } : user
        )
        .map((user) => (user.id === id ? { ...user, role: 'Owner' } : user))
    );
  };

  const handleChangeRole = (id: number, newRole: string) => {
    // Change user role
    setUsers(
      users.map((user) => (user.id === id ? { ...user, role: newRole } : user))
    );
  };

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
              <td className='border-b px-4 py-2'>
                {user.email}
                {!user.invite_accepted && (
                  <span className='ml-2 text-xs text-gray-400'>Invited</span>
                )}
              </td>
              <td className='border-b px-4 py-2'>
                <select
                  value={user.role}
                  onChange={(e) => handleChangeRole(user.id, e.target.value)}
                  className='rounded border p-1'
                >
                  {IrminRoles.filter((role) => role != 'Owner').map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
              <td className='border-b px-4 py-2 text-right'>
                {user.role !== 'Owner' && (
                  <>
                    <button
                      className='mr-2 rounded px-3 py-1 text-xs text-gray-800 transition-all hover:text-gray-500 hover:underline'
                      onClick={() => handleTransferOwnership(user.id)}
                    >
                      Transfer ownership
                    </button>
                    <button
                      className='rounded px-3 py-1 text-gray-800 transition-all hover:bg-gray-500 hover:text-white'
                      onClick={() => handleRemoveUser(user.id)}
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
        <div className='fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50'>
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
              <label className='block text-gray-700'>Role</label>
              <select
                className='mt-2 w-full rounded border p-2'
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {IrminRoles.filter((role) => role != 'Owner').map((role) => (
                  <option key={role} value={role}>
                    {role}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceUsersAndPermissions;
