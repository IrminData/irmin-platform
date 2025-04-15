'use client';

import ReactSelect from 'react-select';

import { IoExit, IoKey } from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/button';
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
import { useWorkspace } from '@/context/WorkspaceContext';

import { IrminRole } from '@/types/core/IrminRole';

/**
 * Workspace users section
 *
 * This component is used to display the list of users and their permissions in the workspace.
 * It allows one to manage the users and their roles in the workspace.
 *
 * @returns {JSX.Element} The workspace users section component.
 */
const WorkspaceUsersSection = () => {
  const { dict } = useLocale();
  const { users, roles, changeUserRole, deleteUser } = useUsers();
  const { workspace, transferWorkspace } = useWorkspace();

  return (
    <ContentWrapper wrapperClassName='max-w-7xl py-4'>
      <Table className='min-w-full'>
        <TableHeader>
          <TableRow className='border-b dark:border-gray-800'>
            <TableHead className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
              {dict.common.name}
            </TableHead>
            <TableHead className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.users.email}
            </TableHead>
            <TableHead className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.users.phone}
            </TableHead>
            <TableHead className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.users.company}
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
          {users.map((user, idx) => (
            <TableRow
              key={`workspace-user-${user.id}-${idx}`}
              className='h-14 border-b dark:border-gray-800'
            >
              <TableCell className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                {user.first_name} {user.last_name}
                {/* Mobile screen details */}
                <span className='block text-xs opacity-70 md:hidden'>
                  {user.email} | {user.phone} | {user.company}
                </span>
              </TableCell>
              <TableCell className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
                {user.email}
              </TableCell>
              <TableCell className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
                {user.phone}
              </TableCell>
              <TableCell className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
                {user.company}
              </TableCell>
              <TableCell className='px-4 py-2 text-xs text-gray-700 dark:text-gray-400'>
                {workspace?.owner?.id === user.id ? (
                  dict.list.owner
                ) : (
                  <ReactSelect
                    // Set the current roles for the user
                    value={
                      user.roles && user.roles.length > 0
                        ? {
                            value: user.roles[0].name,
                            label: user.roles[0].label,
                          }
                        : {
                            value: 'no-role',
                            label: dict.users.noRole,
                          }
                    }
                    onChange={(val) => {
                      // For multi-select, ensure an array is provided
                      if (!val || !Array.isArray(val) || !val.length) return;
                      // Change roles of a user
                      changeUserRole(
                        user.id,
                        val.map((v) => v.value as IrminRole)
                      );
                    }}
                    options={roles.map((role) => ({
                      value: role.name,
                      label: role.label,
                    }))}
                    isMulti={true}
                    isSearchable={false}
                    isClearable={false}
                    className='react-select-container'
                    classNamePrefix='react-select'
                  />
                )}
              </TableCell>
              <TableCell className='px-4 py-2 text-right'>
                {workspace?.owner?.id !== user.id && (
                  <div className='flex w-full flex-row justify-end gap-2 align-middle'>
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      onClick={() => transferWorkspace(user.id)}
                      icon={<IoKey size={14} />}
                      tooltip={dict.users.transferOwnership}
                    />
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label='Remove user from workspace'
                      onClick={() => deleteUser(user.id)}
                      icon={<IoExit size={14} />}
                      tooltip={dict.users.removeFromWorkspace}
                    />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentWrapper>
  );
};

export default WorkspaceUsersSection;
