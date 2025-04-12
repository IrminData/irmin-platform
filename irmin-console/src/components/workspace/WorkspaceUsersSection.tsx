'use client';

import ReactSelect from 'react-select';

import { IoExit, IoKey } from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';

import { useLocale } from '@/context/LocaleContext';
import { useUsers } from '@/context/UsersContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import { IrminRole } from '@/types/core/IrminRole';

/**
 * Workspace Users section
 *
 * This component is used to display the list of users and their permissions in the workspace.
 * It allows to manage the users and their roles in the workspace.
 */
const WorkspaceUsersSection = () => {
  const { dict } = useLocale();
  const { users, roles, changeUserRole, deleteUser } = useUsers();
  const { workspace, transferWorkspace } = useWorkspace();

  return (
    <ContentWrapper wrapperClassName='max-w-7xl py-4'>
      <table className='min-w-full'>
        <thead>
          <tr className='border-b dark:border-gray-800'>
            <th className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
              {dict.common.name}
            </th>
            <th className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.users.email}
            </th>
            <th className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.users.phone}
            </th>
            <th className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.users.company}
            </th>
            <th className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
              {dict.users.role}
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
                {user.first_name} {user.last_name}
                {/* Only for mobile screens */}
                <span className='block text-xs opacity-70 md:hidden'>
                  {user.email} | {user.phone} | {user.company}
                </span>
              </td>
              {/* Only for larger screens */}
              <td className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
                {user.email}
              </td>
              <td className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
                {user.phone}
              </td>
              <td className='hidden px-2 py-2 text-sm text-gray-700 md:table-cell dark:text-gray-400'>
                {user.company}
              </td>
              <td className='px-4 py-2 text-xs text-gray-700 dark:text-gray-400'>
                {workspace?.owner?.id === user.id ? (
                  dict.list.owner
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
                            label: dict.users.noRole,
                          }
                    }
                    onChange={(val) => {
                      if (!val || !val.length) return;
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
              </td>
              <td className='px-4 py-2 text-right'>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ContentWrapper>
  );
};

export default WorkspaceUsersSection;
