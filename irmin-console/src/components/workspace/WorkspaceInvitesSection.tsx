'use client';

import { useCallback, useMemo, useState } from 'react';

import ReactSelect from 'react-select';

import { IoExit, IoMailOpenOutline } from 'react-icons/io5';

import Button, { ButtonWithTooltip } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import WorkspaceSendInviteModalContent from './WorkspaceSendInviteModalContent';

/**
 * Workspace Invites section
 *
 * This component is used to display the list of invites for the workspace.
 * It allows to manage the invites and send new ones.
 */
const WorkspaceInvitesSection: React.FC = () => {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    irminRoles,
    invites: { invites, resendInvite, cancelInvite, changeInvite },
  } = useWorkspace();
  const { irminAlert, irminModal } = usePopup();

  const [processing, setProcessing] = useState(false);

  const loading = useMemo(
    () => workspaceLoading || processing,
    [workspaceLoading, processing]
  );

  const handleResend = useCallback(
    async (inviteId: string) => {
      try {
        setProcessing(true);
        // Resend invite
        const res = await resendInvite(inviteId);
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
    [resendInvite, irminAlert]
  );

  const handleCancelInvite = useCallback(
    async (inviteId: string) => {
      try {
        setProcessing(true);
        // Cancel invite
        const res = await cancelInvite(inviteId);
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
    [cancelInvite, irminAlert]
  );

  const handleChangeInviteRole = useCallback(
    async (inviteId: string, selectedRole: string) => {
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
        // Change invite role
        const res = await changeInvite(inviteId, desiredRole);
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
    [changeInvite, irminAlert, irminRoles]
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
                {dict.usersPermissions.invites}
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
                {loading && invites.length === 0 && (
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
                {invites.map((invite, idx) => (
                  <tr
                    key={`workspace-invite-${invite.id}-${idx}`}
                    className='h-14 border-b dark:border-gray-800'
                  >
                    <td className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                      {invite.name}
                      {/* Only for mobile screens */}
                      <span className='block text-xs opacity-70 md:hidden'>
                        {invite.email}
                      </span>
                    </td>
                    {/* Only for larger screens */}
                    <td className='hidden px-2 py-2 text-sm text-gray-700 dark:text-gray-400 md:table-cell'>
                      {invite.email}
                    </td>
                    <td className='px-4 py-2 text-xs text-gray-700 dark:text-gray-400'>
                      <ReactSelect
                        value={{
                          value: invite.role.name,
                          label: invite.role.label,
                        }}
                        onChange={(val) => {
                          if (!val || !val.value) return;
                          // Change role of an invited user
                          handleChangeInviteRole(invite.id, val.value);
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
                    </td>
                    <td className='px-4 py-2 text-right'>
                      <div className='flex w-full flex-row justify-end gap-2 align-middle'>
                        <ButtonWithTooltip
                          size='icon'
                          variant='secondary'
                          aria-label='Resend invite'
                          icon={<IoMailOpenOutline size={14} />}
                          onClick={() => handleResend(invite.id)}
                          tooltip={dict.usersPermissions.resendInvite}
                          disabled={loading}
                        />
                        <ButtonWithTooltip
                          size='icon'
                          variant='secondary'
                          aria-label='Cancel invite'
                          icon={<IoExit size={14} />}
                          onClick={() => handleCancelInvite(invite.id)}
                          tooltip={dict.usersPermissions.cancelInvite}
                          disabled={loading}
                        />
                      </div>
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

export default WorkspaceInvitesSection;
