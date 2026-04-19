'use client';

import { useCallback } from 'react';

import { IoExit, IoMailOpenOutline } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import { TableSkeleton } from '@/components/ui/loading/TableSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useInvites, useRoles } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils/useResourceAllowed';

import { WorkspaceSendInviteModalContent } from './WorkspaceSendInviteModalContent';

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
  const { isResourceAllowed } = useResourceAllowed();
  const { rolesQuery } = useRoles();
  const { irminModal } = usePopup();
  const {
    invitesQuery,
    resendInviteMutation,
    sendInviteMutation,
    changeInviteRoleMutation,
    deleteInviteMutation,
  } = useInvites();

  const handleSendInvite = useCallback(async () => {
    irminModal.show(
      dict.users.inviteUser,
      <WorkspaceSendInviteModalContent
        roles={rolesQuery.data?.data ?? []}
        handleInvite={(data) => {
          sendInviteMutation.mutate(data);
          irminModal.close();
        }}
        onClose={() => {
          irminModal.close();
        }}
      />
    );
  }, [dict, irminModal, rolesQuery.data?.data, sendInviteMutation]);

  if (invitesQuery.isLoading || rolesQuery.isLoading) {
    return (
      <ContentWrapper wrapperClassName='max-w-7xl py-4'>
        <div className='mb-4 flex flex-row items-center justify-end px-2'>
          <div
            className={`
              h-8 w-24 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
        <TableSkeleton rows={5} columns={3} />
      </ContentWrapper>
    );
  }

  if (invitesQuery.error) {
    return (
      <ContentWrapper wrapperClassName='max-w-7xl py-4'>
        <QueryError
          error={invitesQuery.error}
          onRetry={() => invitesQuery.refetch()}
          title={dict.common.errors.failedToLoadInvites}
          description={dict.common.errors.failedToLoadAgain}
        />
      </ContentWrapper>
    );
  }

  if (rolesQuery.error) {
    return (
      <ContentWrapper wrapperClassName='max-w-7xl py-4'>
        <QueryError
          error={rolesQuery.error}
          onRetry={() => rolesQuery.refetch()}
          title={dict.common.errors.failedToLoadInvites}
          description={dict.common.errors.failedToLoadAgain}
        />
      </ContentWrapper>
    );
  }

  const invites = invitesQuery.data?.data ?? [];
  const hasInvites = invites.length > 0;

  return (
    <ContentWrapper wrapperClassName='max-w-7xl py-4'>
      {/* Row containing the invite button */}
      <div className='mb-4 flex flex-row items-center justify-end px-2'>
        <Button size='sm' variant='default' onClick={handleSendInvite}>
          {dict.users.inviteUser}
        </Button>
      </div>

      {!hasInvites ? (
        <EmptyState
          title={dict.list.emptyState.invites.title}
          description={dict.list.emptyState.invites.description}
          action={{
            label: dict.users.inviteUser,
            onClick: handleSendInvite,
            variant: 'gradient',
          }}
          hideActionButton={!isResourceAllowed('invite', 'create')}
          className='py-16'
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className={`
                  hidden p-2 text-left text-sm font-normal
                  md:table-cell
                `}
              >
                {dict.common.email}
              </TableHead>
              <TableHead
                className={`
                  px-4 py-2 text-left text-xs font-normal
                  md:text-sm
                `}
              >
                {dict.users.role}
              </TableHead>
              <TableHead
                className={`
                  px-4 py-2 text-center text-xs font-normal
                  md:text-right md:text-sm
                `}
              >
                {/* Actions */}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow
                key={`workspace-invite-${invite.id}`}
                className={`
                  h-14 border-b
                  dark:border-gray-800
                `}
              >
                <TableCell
                  className={`
                    px-4 py-2 text-sm text-gray-700
                    dark:text-gray-400
                  `}
                >
                  {invite.email}
                </TableCell>
                <TableCell
                  className={`
                    px-4 py-2 text-xs text-gray-700
                    dark:text-gray-400
                  `}
                >
                  <Select
                    value={invite.role.id}
                    onValueChange={(value) => {
                      if (!value) return;
                      // Change role of an invited user
                      changeInviteRoleMutation.mutate({
                        id: invite.id,
                        roleId: value,
                      });
                    }}
                  >
                    <SelectTrigger className='w-[200px]'>
                      <SelectValue placeholder={invite.role.role} />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesQuery.data?.data?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className='px-4 py-2 text-right'>
                  <div
                    className={`
                      flex w-full flex-row justify-end gap-2 align-middle
                    `}
                  >
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label='Resend invite'
                      icon={<IoMailOpenOutline size={14} />}
                      onClick={() => resendInviteMutation.mutate(invite.id)}
                      tooltip={dict.users.resendInvite}
                    />
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label='Cancel invite'
                      icon={<IoExit size={14} />}
                      onClick={() => deleteInviteMutation.mutate(invite.id)}
                      tooltip={dict.users.cancelInvite}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ContentWrapper>
  );
};

export default WorkspaceInvitesSection;
