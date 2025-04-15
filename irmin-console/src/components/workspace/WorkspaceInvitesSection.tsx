'use client';

import ReactSelect from 'react-select';

import { IoExit, IoMailOpenOutline } from 'react-icons/io5';

import Button, { ButtonWithTooltip } from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';
import { useUsers } from '@/context/UsersContext';

/**
 * Workspace Invites section
 *
 * This component is used to display the list of invites for the workspace.
 * It allows one to manage the invites and send new ones.
 *
 * @returns {JSX.Element} The workspace invites section component.
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
    <ContentWrapper wrapperClassName='max-w-7xl py-4'>
      {/* Row containing the invite button */}
      <div className='flex flex-row items-center justify-end px-2'>
        <Button size='sm' variant='default' onClick={() => sendInvite()}>
          {dict.users.inviteUser}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.users.email}
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
              {dict.users.role}
            </TableHead>
            <TableHead className='px-4 py-2 text-center text-xs font-normal md:text-right md:text-sm'>
              {/* Actions */}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite, idx) => (
            <TableRow
              key={`workspace-invite-${invite.id}-${idx}`}
              className='h-14 border-b dark:border-gray-800'
            >
              <TableCell className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                {invite.email}
              </TableCell>
              <TableCell className='px-4 py-2 text-xs text-gray-700 dark:text-gray-400'>
                <ReactSelect
                  // Set the current role for the invited user
                  value={{
                    value: roles.find((role) => role.name === invite.role)
                      ?.name,
                    label: roles.find((role) => role.name === invite.role)
                      ?.label,
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
              </TableCell>
              <TableCell className='px-4 py-2 text-right'>
                <div className='flex w-full flex-row justify-end gap-2 align-middle'>
                  <ButtonWithTooltip
                    size='icon'
                    variant='secondary'
                    aria-label='Resend invite'
                    icon={<IoMailOpenOutline size={14} />}
                    onClick={() => resendInvite(invite.id)}
                    tooltip={dict.users.resendInvite}
                  />
                  <ButtonWithTooltip
                    size='icon'
                    variant='secondary'
                    aria-label='Cancel invite'
                    icon={<IoExit size={14} />}
                    onClick={() => deleteInvite(invite.id)}
                    tooltip={dict.users.cancelInvite}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentWrapper>
  );
};

export default WorkspaceInvitesSection;
