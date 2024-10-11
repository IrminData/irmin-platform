'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import ReactSelect from 'react-select';

import { IoExit, IoKey, IoMailOpenOutline } from 'react-icons/io5';

import Button, { ButtonWithTooltip } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { IrminRole } from '@/types/core/IrminRole';
import { WorkspaceUser } from '@/types/core/Workspace';

import LoadingSkeleton from '../ui/loading/LoadingSkeleton';
import WorkspaceSendInviteModalContent from './WorkspaceSendInviteModalContent';

type WorkspaceUsersAndPermissionsUser = {
  inviteId?: string;
} & WorkspaceUser;

/**
 * Workspace Users and Invites section component
 *
 * This component is used to display the list of users and their permissions in the workspace.
 * It allows to manage the users and their roles in the workspace.
 *
 * This component shows both regular users and invited users that have not yet accepted the invite as
 * entities on the list.
 */
const WorkspaceUsersAndInvitesSection: React.FC = () => {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    workspaces: { currentWorkspace, switchWorkspace, transferOwnership },
    irminRoles,
    users: { users: workspaceUsers, deleteUser, changeUserRole },
    invites: {
      invites: workspaceInvites,
      resendInvite,
      cancelInvite,
      changeInvite,
    },
  } = useWorkspace();
  const { irminAlert, irminConfirm, irminModal } = usePopup();

  const [users, setUsers] = useState<WorkspaceUsersAndPermissionsUser[]>([]);

  const [processing, setProcessing] = useState(false);

  const loading = useMemo(
    () => workspaceLoading || processing || !currentWorkspace,
    [workspaceLoading, processing, currentWorkspace]
  );

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
            id: `invite-${inviteCount}`,
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

  const handleResend = useCallback(
    async (email: string) => {
      try {
        setProcessing(true);
        // Validate invite data
        const invitedUser = users.find((user) => user.email === email);
        if (!invitedUser || typeof invitedUser.inviteId !== 'number') return;
        // Resend invite
        const res = await resendInvite(invitedUser.inviteId);
        // Inform that invite has been resent
        irminAlert('success', res.message ?? 'Invite resent successfully');
      } catch (error) {
        console.error('Error resending invite:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error resending invite'
        );
      } finally {
        setProcessing(false);
      }
    },
    [users, resendInvite, irminAlert]
  );

  const handleCancelInvite = useCallback(
    async (email: string) => {
      try {
        setProcessing(true);
        const invitedUser = users.find((user) => user.email === email);
        if (!invitedUser || typeof invitedUser.inviteId !== 'number') return;
        // Cancel invite
        const res = await cancelInvite(invitedUser.inviteId);
        // Remove user from the list
        setUsers(users.filter((user) => user.email !== email));
        irminAlert('success', res.message ?? 'Invite canceled successfully');
      } catch (error) {
        console.error('Error canceling invite:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error canceling invite'
        );
      } finally {
        setProcessing(false);
      }
    },
    [users, cancelInvite, irminAlert]
  );

  const handleRemoveUser = useCallback(
    async (id: string) => {
      // Confirm removal
      const confirmed = await irminConfirm(
        'info',
        dict.usersPermissions.removeUserConfirmation
      );
      if (!confirmed) return;
      try {
        setProcessing(true);
        // Remove user from workspace
        const res = await deleteUser(id);
        // Remove user from the list
        setUsers(users.filter((user) => user.id !== id));
        irminAlert(
          'success',
          res.message ?? 'User removed successfully from the workspace'
        );
      } catch (error) {
        console.error('Error changing user role:', error);
        irminAlert('error', (error as Error)?.message ?? 'Error removing user');
      } finally {
        setProcessing(false);
      }
    },
    [deleteUser, irminAlert, irminConfirm, dict, users]
  );

  const handleTransferOwnership = useCallback(
    async (id: string) => {
      // Confirm transfer
      const confirmed = await irminConfirm(
        'warning',
        dict.usersPermissions.transferOwnershipConfirmation
      );
      if (!confirmed) return;
      // Transfer confirmed
      try {
        setProcessing(true);
        // Transfer ownership
        const res = await transferOwnership(id);
        // Refetch the current workspace
        switchWorkspace(currentWorkspace?.slug ?? '');
        // Inform that ownership has been transferred
        irminAlert(
          'success',
          res.message ?? 'Ownership transfered successfully'
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
    },
    [
      transferOwnership,
      irminAlert,
      irminConfirm,
      dict,
      currentWorkspace,
      switchWorkspace,
    ]
  );

  const handleChangeRole = useCallback(
    async (id: string, newRole: IrminRole) => {
      try {
        setProcessing(true);
        // Change user role
        const res = await changeUserRole(id, newRole.name);
        // Update the local state of workspace users
        const newUsers = users.map((user) => {
          if (user.id === id) {
            return {
              ...user,
              roles: [
                irminRoles.find((a) => a.name === newRole.name) ??
                  irminRoles[0],
              ],
            };
          }
          return user;
        });
        setUsers(newUsers);
        irminAlert('success', res.message ?? 'User role changed successfully');
      } catch (error) {
        console.error('Error changing user role:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error changing user role'
        );
      } finally {
        setProcessing(false);
      }
    },
    [changeUserRole, irminAlert, irminRoles, users]
  );

  const handleChangeInviteRole = useCallback(
    async (inviteId: string, newRole: IrminRole) => {
      try {
        setProcessing(true);
        // Change invite role
        const res = await changeInvite(inviteId, newRole);
        // Update the local state of workspace users
        const newUsers = users.map((user) => {
          if (user.inviteId === inviteId) {
            return {
              ...user,
              roles: [
                irminRoles.find((a) => a.name === newRole.name) ??
                  irminRoles[0],
              ],
            };
          }
          return user;
        });
        setUsers(newUsers);
        // Inform that invite role has been changed
        irminAlert(
          'success',
          res.message ?? 'Invite role changed successfully'
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
    },
    [changeInvite, irminAlert, irminRoles, users]
  );

  const handleSendNewInvite = useCallback(() => {
    irminModal.show(
      dict.usersPermissions.inviteUser,
      <WorkspaceSendInviteModalContent
        irminRoles={irminRoles}
        onClose={() => {
          irminModal.close();
        }}
      />
    );
  }, [dict, irminModal, irminRoles]);

  return (
    <div className='my-8 px-2'>
      <div className='container relative mx-auto my-8 max-w-6xl'>
        <div className='w-full max-w-3xl rounded-lg border-b border-t border-accent bg-background px-4 py-4 shadow-md md:mx-4'>
          <div className='my-8 px-4'>
            <div className='mb-8 flex flex-row items-center justify-between px-2'>
              <h2 className='text-lg font-semibold lg:text-xl'>
                {dict.usersPermissions.usersAndPermissions}
              </h2>
              <Button
                size='sm'
                variant='default'
                onClick={() => handleSendNewInvite()}
                disabled={loading}
              >
                {dict.usersPermissions.inviteUser}
              </Button>
            </div>
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
                {loading && users.length === 0 && (
                  <>
                    {[...Array(8)].map((_, index) => (
                      <tr
                        key={`users-loading-skeleton-${index}`}
                        className='h-14 border-b dark:border-gray-800'
                      >
                        <td className='px-1 py-2'>
                          <LoadingSkeleton className={`h-8 w-full`} />
                        </td>
                        <td className='px-1 py-2'>
                          <LoadingSkeleton className={`h-8 w-full`} />
                        </td>
                        <td className='px-1 py-2'>
                          <LoadingSkeleton className={`h-8 w-full`} />
                        </td>
                        <td className='px-1 py-2'>
                          <LoadingSkeleton className={`h-8 w-full`} />
                        </td>
                      </tr>
                    ))}
                  </>
                )}
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
                    <td className='hidden px-2 py-2 text-sm text-gray-700 dark:text-gray-400 md:table-cell'>
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
                      {currentWorkspace?.owner_id === user.id ? (
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
                              handleChangeInviteRole(
                                user.inviteId,
                                desiredRole
                              );
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
                      {currentWorkspace?.owner_id !== user.id && (
                        <div className='flex w-full flex-row justify-end gap-2 align-middle'>
                          {user.roles &&
                          user.roles.length > 0 &&
                          !user.inviteId ? (
                            <>
                              <ButtonWithTooltip
                                size='icon'
                                variant='secondary'
                                onClick={() => handleTransferOwnership(user.id)}
                                icon={<IoKey size={14} />}
                                tooltip={
                                  dict.usersPermissions.transferOwnership
                                }
                                disabled={loading}
                              />
                              <ButtonWithTooltip
                                size='icon'
                                variant='secondary'
                                aria-label='Remove user from workspace'
                                onClick={() => handleRemoveUser(user.id)}
                                icon={<IoExit size={14} />}
                                tooltip={
                                  dict.usersPermissions.removeFromWorkspace
                                }
                                disabled={loading}
                              />
                            </>
                          ) : (
                            <></>
                          )}
                          {user.inviteId ? (
                            <>
                              <ButtonWithTooltip
                                size='icon'
                                variant='secondary'
                                aria-label='Resend invite'
                                icon={<IoMailOpenOutline size={14} />}
                                onClick={() => handleResend(user.email)}
                                tooltip={dict.usersPermissions.resendInvite}
                                disabled={loading}
                              />
                              <ButtonWithTooltip
                                size='icon'
                                variant='secondary'
                                aria-label='Cancel invite'
                                icon={<IoExit size={14} />}
                                onClick={() => handleCancelInvite(user.email)}
                                tooltip={dict.usersPermissions.cancelInvite}
                                disabled={loading}
                              />
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceUsersAndInvitesSection;
