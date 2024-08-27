'use client';

import React, { useEffect, useState } from 'react';

import ReactSelect from 'react-select';

import { IoExit, IoKey, IoMailOpenOutline } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import Modal from '@/components/common/popup/Modal';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { WorkspaceUser } from '@/types/api/Workspace';

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
const UsersAndInvites: React.FC = () => {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    workspaces: { currentWorkspace, switchWorkspace, transferOwnership },
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

  const [processing, setProcessing] = useState(false);
  const loading = workspaceLoading || processing || !currentWorkspace;

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
              irminRoles.find((role) => role.name === invite.role?.name) ??
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
      // Prevent if something is loading and set processing state
      if (loading) return;
      setProcessing(true);
      // Validate invite data
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
    } finally {
      setProcessing(false);
    }
  };

  const handleResend = async (email: string) => {
    try {
      // Prevent if something is loading and set processing state
      if (loading) return;
      setProcessing(true);
      // Validate invite data
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
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelInvite = async (email: string) => {
    try {
      // Prevent if something is loading and set processing state
      if (loading) return;
      setProcessing(true);
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
    } finally {
      setProcessing(false);
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
            // Prevent if something is loading and set processing state
            if (loading) return;
            setProcessing(true);
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
          } finally {
            setProcessing(false);
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
          try {
            // Prevent if something is loading and set processing state
            if (loading) return;
            setProcessing(true);
            // Transfer ownership
            const res = await transferOwnership(id);
            // Refetch the current workspace
            switchWorkspace(currentWorkspace.slug);
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
          } finally {
            setProcessing(false);
          }
        }
      }
    );
  };

  const handleChangeRole = async (id: number, newRole: IrminRole) => {
    try {
      // Prevent if something is loading and set processing state
      if (loading) return;
      setProcessing(true);
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
    } finally {
      setProcessing(false);
    }
  };

  const handleChangeInviteRole = async (
    inviteId: number,
    newRole: IrminRole
  ) => {
    try {
      // Prevent if something is loading and set processing state
      if (loading) return;
      setProcessing(true);
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
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className='my-8 px-2'>
      <div className='mb-4 flex flex-row items-center justify-between px-2'>
        <h2 className='text-base md:text-xl xl:text-2xl'>
          {dict.usersPermissions.usersAndPermissions}
        </h2>
        <Button
          size='sm'
          variant='solid'
          colorScheme='primary'
          onClick={() => setIsInviteModalOpen(true)}
          disabled={loading}
        >
          {dict.usersPermissions.inviteUser}
        </Button>
      </div>
      {loading ? (
        <div id='workspace-users-loading-skeleton'>
          <LoadingSkeleton />
        </div>
      ) : (
        <table className='min-w-full'>
          <thead>
            <tr className='border-b dark:border-gray-800'>
              <th className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
                {dict.usersPermissions.name}
              </th>
              <th className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
                {dict.usersPermissions.email}
              </th>
              <th className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
                {dict.usersPermissions.role}
              </th>
              <th className='px-4 py-2 text-center text-xs font-normal md:text-right md:text-sm'>
                {/* Actions */}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr
                key={`workspace-user-${user.id}-${idx}`}
                className='h-14 border-b dark:border-gray-800'
              >
                <td className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                  {user.name}
                  {/* Only for mobile screens */}
                  <span className='block text-xs opacity-70 md:hidden'>
                    {user.email}
                  </span>
                  {user.inviteId ? (
                    <span className='block text-xs opacity-70 md:hidden'>
                      {dict.usersPermissions.invited}
                    </span>
                  ) : (
                    <></>
                  )}
                </td>
                {/* Only for larger screens */}
                <td className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
                  {user.email}
                  {user.inviteId ? (
                    <span className='ml-2 text-xs opacity-70'>
                      {dict.usersPermissions.invited}
                    </span>
                  ) : (
                    <></>
                  )}
                </td>
                <td className='px-4 py-2 text-xs text-gray-700 dark:text-gray-400'>
                  {currentWorkspace.owner_id === user.id ? (
                    dict.usersPermissions.owner
                  ) : (
                    <ReactSelect
                      value={
                        user.roles && user.roles.length > 0
                          ? {
                              value: user.roles[0].name,
                              label: user.roles[0].label,
                            }
                          : {
                              value: 'no-role',
                              label: dict.usersPermissions.noRole,
                            }
                      }
                      onChange={(val) => {
                        if (!val || !val.value) return;
                        const desiredRole = irminRoles.find(
                          (role) => role.name === val.value
                        )!;
                        if (!desiredRole || val.value === 'no-role') {
                          irminAlert('error', 'Invalid role');
                          return;
                        }
                        if (typeof user.inviteId === 'number') {
                          // Change role of an invited user
                          handleChangeInviteRole(user.inviteId, desiredRole);
                        } else {
                          // Change role of a regular user
                          handleChangeRole(user.id, desiredRole);
                        }
                      }}
                      options={irminRoles.map((role) => ({
                        value: role.name,
                        label: role.label,
                      }))}
                      isLoading={loading}
                      isSearchable={false}
                      isClearable={false}
                      className='react-select-container'
                      classNamePrefix='react-select'
                    />
                  )}
                </td>
                <td className='px-4 py-2 text-right'>
                  {currentWorkspace.owner_id !== user.id && (
                    <div className='flex w-full flex-row justify-end gap-2 align-middle'>
                      {user.roles && user.roles.length > 0 && !user.inviteId ? (
                        <>
                          <Button
                            size='sm'
                            variant='icon'
                            colorScheme='gray'
                            aria-label='Transfer ownership to user'
                            onClick={() => handleTransferOwnership(user.id)}
                            icon={<IoKey size={14} />}
                          >
                            {''}
                            {/* {dict.usersPermissions.transferOwnership} */}
                          </Button>
                          <Button
                            size='sm'
                            variant='icon'
                            colorScheme='gray'
                            aria-label='Remove user from workspace'
                            onClick={() => handleRemoveUser(user.id)}
                            icon={<IoExit size={14} />}
                          >
                            {''}
                            {/* {dict.usersPermissions.removeFromWorkspace} */}
                          </Button>
                        </>
                      ) : (
                        <></>
                      )}
                      {user.inviteId ? (
                        <>
                          <Button
                            size='sm'
                            variant='icon'
                            colorScheme='gray'
                            aria-label='Resend invite'
                            icon={<IoMailOpenOutline size={14} />}
                            onClick={() => handleResend(user.email)}
                          >
                            {''}
                            {/* {dict.usersPermissions.resendInvite} */}
                          </Button>
                          <Button
                            size='sm'
                            variant='icon'
                            colorScheme='gray'
                            aria-label='Cancel invite'
                            icon={<IoExit size={14} />}
                            onClick={() => handleCancelInvite(user.email)}
                          >
                            {''}
                            {/* {dict.usersPermissions.cancelInvite} */}
                          </Button>
                        </>
                      ) : (
                        <></>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isInviteModalOpen && (
        <Modal
          isOpen={isInviteModalOpen}
          title={dict.usersPermissions.inviteUser}
          onClose={() => setIsInviteModalOpen(false)}
        >
          <div className='pb-4'>
            <div className='mb-4'>
              <label className='block text-gray-700'>
                {dict.usersPermissions.name}
              </label>
              <Input
                variant='solid'
                colorScheme='gray'
                className='mt-2 w-full'
                size='sm'
                type='text'
                placeholder='John Doe'
                defaultValue={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className='mb-4'>
              <label className='block text-gray-700'>
                {dict.usersPermissions.email}
              </label>
              <Input
                variant='solid'
                colorScheme='gray'
                className='mt-2 w-full'
                size='sm'
                type='email'
                placeholder='johndoe@example.com'
                defaultValue={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className='mb-4'>
              <label className='block text-gray-700'>
                {dict.usersPermissions.role}
              </label>
              <div className='mt-2 w-full'>
                <ReactSelect
                  value={
                    inviteRole
                      ? {
                          value: inviteRole,
                          label: irminRoles.find((a) => a.name === inviteRole)
                            ?.label,
                        }
                      : {
                          value: irminRoles[0].name,
                          label: irminRoles[0].label,
                        }
                  }
                  onChange={(val) => {
                    if (!val || !val.value) return;
                    setInviteRole(val.value);
                  }}
                  options={irminRoles.map((role) => ({
                    value: role.name,
                    label: role.label,
                  }))}
                  isLoading={loading}
                  isSearchable={false}
                  isClearable={false}
                  className='react-select-container'
                  classNamePrefix='react-select'
                />
              </div>
            </div>
            <div className='flex flex-row gap-2'>
              <Button
                size='sm'
                variant='link'
                colorScheme='primary'
                onClick={() => setIsInviteModalOpen(false)}
              >
                {dict.usersPermissions.cancel}
              </Button>
              <Button
                size='sm'
                className='ml-auto min-w-32'
                variant='solid'
                colorScheme='primary'
                onClick={handleInvite}
                disabled={loading}
              >
                {dict.usersPermissions.invite}
              </Button>
            </div>
            {inviteError && inviteError.length > 0 && (
              <p className='mt-4 text-red-800'>{inviteError}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UsersAndInvites;
