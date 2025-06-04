'use client';

import React from 'react';

import { IoExit, IoKey } from 'react-icons/io5';
import { TbBook } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useRoles } from '@/hooks/useRoles';
import { useUsers } from '@/hooks/useUsers';

/**
 * Workspace users section
 *
 * This component is used to display the list of users and their permissions in the workspace.
 * It allows one to manage the users and their roles in the workspace.
 */
const WorkspaceUsersSection = () => {
  const { dict, locale } = useLocale();
  const { rolesQuery } = useRoles();
  const { usersQuery, deleteUserMutation, changeUserRoleMutation } = useUsers();
  const { workspaceSlug, workspaceQuery, confirmTransferWorkspace } =
    useWorkspaceContext();

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
          {usersQuery.data?.data?.map((user, idx) => (
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
                {workspaceQuery?.data?.data?.owner?.id === user.id ? (
                  dict.list.owner
                ) : (
                  <MultiSelect
                    options={
                      rolesQuery.data?.data?.map((role) => ({
                        value: role.id,
                        label: role.role,
                      })) ?? []
                    }
                    defaultValue={user.roles?.map((role) => role.id) ?? []}
                    onValueChange={(values) => {
                      if (!values.length) return;
                      // Change roles of a user
                      changeUserRoleMutation.mutate({
                        id: user.id,
                        roles: values,
                      });
                    }}
                    placeholder={dict.users.noRole}
                    className='w-[200px]'
                  />
                )}
              </TableCell>
              <TableCell className='px-4 py-2 text-right'>
                <div className='flex w-full flex-row justify-end gap-2 align-middle'>
                  <ButtonWithTooltip
                    size='icon'
                    variant='secondary'
                    icon={<TbBook size={14} />}
                    href={`/${locale}/workspace/${workspaceSlug}/logs/user/${user.id}`}
                    tooltip={dict.common.logs}
                  />
                  {workspaceQuery?.data?.data?.owner?.id !== user.id && (
                    <div className='contents'>
                      <ButtonWithTooltip
                        size='icon'
                        variant='secondary'
                        onClick={() => confirmTransferWorkspace(user.id)}
                        icon={<IoKey size={14} />}
                        tooltip={dict.users.transferOwnership}
                      />
                      <ButtonWithTooltip
                        size='icon'
                        variant='secondary'
                        aria-label='Remove user from workspace'
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        icon={<IoExit size={14} />}
                        tooltip={dict.users.removeFromWorkspace}
                      />
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentWrapper>
  );
};

export default WorkspaceUsersSection;
