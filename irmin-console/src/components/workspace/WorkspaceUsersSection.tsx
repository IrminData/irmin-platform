'use client';

import { useCallback, useMemo, useState } from 'react';

import ReactSelect from 'react-select';

import { IoExit, IoKey } from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Workspace Users section
 *
 * This component is used to display the list of users and their permissions in the workspace.
 * It allows to manage the users and their roles in the workspace.
 */
const WorkspaceUsersSection: React.FC = () => {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    workspaces: { currentWorkspace, switchWorkspace, transferOwnership },
    irminRoles,
    users: { users, deleteUser, changeUserRole },
  } = useWorkspace();
  const { irminAlert, irminConfirm } = usePopup();

  const [processing, setProcessing] = useState(false);

  const loading = useMemo(
    () => workspaceLoading || processing || !currentWorkspace,
    [workspaceLoading, processing, currentWorkspace]
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
    [deleteUser, irminAlert, irminConfirm, dict]
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
    async (id: string, selectedRole: string) => {
      try {
        setProcessing(true);
        // Find the role
        const desiredRole = irminRoles.find(
          (role) => role.name === selectedRole
        )!;
        if (!desiredRole || selectedRole === 'no-role') {
          irminAlert('error', 'Invalid role');
          return;
        }
        // Change user role
        const res = await changeUserRole(id, desiredRole.name);
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
    [changeUserRole, irminAlert, irminRoles]
  );

  return (
    <div className='my-8 px-2'>
      <div className='container relative mx-auto my-8 max-w-6xl'>
        <div className='w-full max-w-3xl rounded-lg border-b border-t border-accent bg-background px-4 py-4 shadow-md md:mx-4'>
          <div className='my-8 px-4'>
            <div className='mb-8 flex flex-row items-center justify-between px-2'>
              <h2 className='text-lg font-semibold lg:text-xl'>
                {dict.usersPermissions.usersAndPermissions}
              </h2>
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
                    </td>
                    {/* Only for larger screens */}
                    <td className='hidden px-2 py-2 text-sm text-gray-700 dark:text-gray-400 md:table-cell'>
                      {user.email}
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
                            // Change role of a user
                            handleChangeRole(user.id, val.value);
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
                          <ButtonWithTooltip
                            size='icon'
                            variant='secondary'
                            onClick={() => handleTransferOwnership(user.id)}
                            icon={<IoKey size={14} />}
                            tooltip={dict.usersPermissions.transferOwnership}
                            disabled={loading}
                          />
                          <ButtonWithTooltip
                            size='icon'
                            variant='secondary'
                            aria-label='Remove user from workspace'
                            onClick={() => handleRemoveUser(user.id)}
                            icon={<IoExit size={14} />}
                            tooltip={dict.usersPermissions.removeFromWorkspace}
                            disabled={loading}
                          />
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

export default WorkspaceUsersSection;
