'use client';

import ReactSelect from 'react-select';

import { IoExit, IoMailOpenOutline } from 'react-icons/io5';

import Button, { ButtonWithTooltip } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { useUsers } from '@/context/UsersContext';

/**
 * Workspace Invites section
 *
 * This component is used to display the list of invites for the workspace.
 * It allows to manage the invites and send new ones.
 */
const WorkspaceInvitesSection = () => {
  const { dict } = useLocale();
  const {
    invites,
    roles,
    resendInvite,
    sendInvite,
    changeInviteRole,
    deleteInvite,
  } = useUsers();

  return (
    <div className='my-8 px-2'>
      <div className='container relative mx-auto my-8 max-w-6xl'>
        <div className='w-full max-w-3xl rounded-lg border-b border-t border-accent bg-background px-4 py-4 shadow-md md:mx-4'>
          <div className='my-8 px-4'>
            <div className='mb-8 flex flex-row items-center justify-between px-2'>
              <h2 className='text-lg font-semibold lg:text-xl'>
                {dict.usersPermissions.invites}
              </h2>
              <Button size='sm' variant='default' onClick={() => sendInvite()}>
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
                    <td className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
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
                          changeInviteRole(invite.id, val.value);
                        }}
                        options={roles.map((role) => ({
                          value: role.name,
                          label: role.label,
                        }))}
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
                          onClick={() => resendInvite(invite.id)}
                          tooltip={dict.usersPermissions.resendInvite}
                        />
                        <ButtonWithTooltip
                          size='icon'
                          variant='secondary'
                          aria-label='Cancel invite'
                          icon={<IoExit size={14} />}
                          onClick={() => deleteInvite(invite.id)}
                          tooltip={dict.usersPermissions.cancelInvite}
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
