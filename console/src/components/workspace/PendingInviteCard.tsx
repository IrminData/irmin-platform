'use client';

import { TbCheck, TbX } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { useInvite } from '@/hooks/api';

import { formatDate } from '@/utils/formatTimestamp';

import type { Invite } from '@/types/core/Invite';

/**
 * A card component for displaying a single pending workspace invite.
 *
 * @param props - Component props
 * @param props.invite - The invite to display
 */
const PendingInviteCard = ({ invite }: { invite: Invite }) => {
  const { dict, locale } = useLocale();
  const { acceptInviteMutation, declineInviteMutation } = useInvite(invite.id, {
    skipDeclineNavigation: true,
    skipQuery: true,
  });

  const inviterName =
    `${invite.invited_by.first_name} ${invite.invited_by.last_name}`.trim() ||
    invite.invited_by.email;

  const expiresDate = formatDate(invite.expires_at, locale);

  return (
    <div
      className={`
        flex items-center justify-between gap-4 rounded-[2px] border
        border-primary/20 bg-primary/5 p-4
      `}
    >
      <div className='min-w-0 flex-1'>
        <p className='truncate font-medium'>{invite.workspace.name}</p>
        <p className='truncate text-sm text-muted-foreground'>
          {dict.invite.invitedBy} {inviterName} &middot; {dict.invite.asRole}{' '}
          {invite.role.role}
        </p>
        <p className='text-xs text-muted-foreground'>
          {dict.invite.expires} {expiresDate}
        </p>
      </div>
      <div className='flex shrink-0 gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => declineInviteMutation.mutate(invite.id)}
          disabled={
            declineInviteMutation.isPending || acceptInviteMutation.isPending
          }
        >
          <TbX className='mr-1 size-3.5' />
          {declineInviteMutation.isPending
            ? dict.invite.declining
            : dict.invite.decline}
        </Button>
        <Button
          variant='accent'
          size='sm'
          onClick={() => acceptInviteMutation.mutate(invite.id)}
          disabled={
            acceptInviteMutation.isPending || declineInviteMutation.isPending
          }
        >
          <TbCheck className='mr-1 size-3.5' />
          {acceptInviteMutation.isPending
            ? dict.invite.accepting
            : dict.invite.accept}
        </Button>
      </div>
    </div>
  );
};

export default PendingInviteCard;
