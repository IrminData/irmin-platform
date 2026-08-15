'use client';

import { useCallback } from 'react';

import { TbLogout, TbMailOpened } from 'react-icons/tb';

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
          <div className={`h-8 w-24 animate-pulse rounded-[2px] bg-muted`} />
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
        <Button size='sm' variant='accent' onClick={handleSendInvite}>
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
                className={`h-14 border-b border-border`}
              >
                <TableCell
                  className={`px-4 py-2 text-sm text-muted-foreground`}
                >
                  {invite.email}
                </TableCell>
                <TableCell
                  className={`px-4 py-2 text-xs text-muted-foreground`}
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
                      aria-label={dict.users.resendInvite}
                      icon={<TbMailOpened size={14} />}
                      onClick={() => resendInviteMutation.mutate(invite.id)}
                      tooltip={dict.users.resendInvite}
                    />
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label={dict.users.cancelInvite}
                      icon={<TbLogout size={14} />}
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
