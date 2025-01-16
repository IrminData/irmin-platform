'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { User } from '@clerk/nextjs/server';

import { TbCheck, TbLogin, TbX } from 'react-icons/tb';

import { acceptInvite, declineInvite } from '@/lib/actions/invites';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { InviteSignedURLPayload } from '@/types/core/Invite';

export default function AcceptInviteSection({
  invitePayload,
  user,
  hash,
}: {
  invitePayload: InviteSignedURLPayload;
  user?: User;
  hash: string;
}) {
  const router = useRouter();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();

  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleAccept = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      const res = await acceptInvite(
        invitePayload.invite,
        hash,
        user ? undefined : password,
        user ? undefined : confirmPassword
      );
      irminAlert('success', res.message ?? 'Invite accepted successfully');
      router.push('/workspace');
    } catch (error) {
      setError((error as Error).message ?? 'Failed to accept invite');
    } finally {
      setIsLoading(false);
    }
  }, [
    invitePayload,
    hash,
    password,
    confirmPassword,
    irminAlert,
    router,
    user,
  ]);

  const handleDecline = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await declineInvite(invitePayload.invite, hash);
      irminAlert('success', res.message ?? 'Invite declined successfully');
      router.push('/');
    } catch (error) {
      setError((error as Error).message ?? 'Failed to decline invite');
    } finally {
      setIsLoading(false);
    }
  }, [invitePayload, hash, irminAlert, router]);

  const handleLogin = useCallback(() => {
    router.push('/sign-in');
  }, [router]);

  const renderActionButtons = () => {
    if (invitePayload.has_an_account && !user) {
      return (
        <Button onClick={handleLogin} className='w-full'>
          <TbLogin className='mr-2 h-4 w-4' /> {dict.invite.loginToAccept}
        </Button>
      );
    }

    if (!invitePayload.has_an_account) {
      return (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='password'>{dict.invite.setPassword}</Label>
            <Input
              id='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={dict.invite.enterNewPassword}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='confirm-password'>
              {dict.invite.confirmPassword}
            </Label>
            <Input
              id='confirm-password'
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={dict.invite.reenterPassword}
            />
          </div>
          {error && <p className='text-sm text-red-500'>{error}</p>}
          <div className='flex items-center justify-between'>
            <Button
              variant='outline'
              onClick={handleDecline}
              disabled={isLoading}
              className='w-[calc(50%-0.5rem)]'
            >
              <TbX className='mr-2 h-4 w-4' /> {dict.invite.declineInvitation}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isLoading || !password || !confirmPassword}
              className='w-[calc(50%-0.5rem)]'
            >
              <TbCheck className='mr-2 h-4 w-4' />{' '}
              {dict.invite.acceptAndCreateAccount}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className='flex items-center justify-between'>
        <Button
          variant='outline'
          onClick={handleDecline}
          disabled={isLoading}
          className='w-[calc(50%-0.5rem)]'
        >
          <TbX className='mr-2 h-4 w-4' /> {dict.invite.declineInvitation}
        </Button>
        <Button
          onClick={handleAccept}
          disabled={isLoading}
          className='w-[calc(50%-0.5rem)]'
        >
          <TbCheck className='mr-2 h-4 w-4' /> {dict.invite.acceptInvitation}
        </Button>
      </div>
    );
  };

  return (
    <div
      id='accept-invite-section'
      className='container relative mx-auto my-2 max-w-6xl'
    >
      <div className='mx-auto w-full max-w-3xl rounded-lg border border-border bg-background shadow-sm'>
        <div className='space-y-4 p-6'>
          <div>
            <h2 className='text-2xl font-semibold text-foreground'>
              {dict.invite.workspaceInvitation}
            </h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              {dict.invite.workspaceInvitationDescription}
            </p>
          </div>

          <Separator />

          <div className='space-y-2 text-sm'>
            <p>
              <span className='font-medium'>{dict.invite.invitedBy}:</span>{' '}
              <span className='text-foreground'>{invitePayload.inviter}</span>
            </p>
            <p>
              <span className='font-medium'>{dict.invite.workspace}:</span>{' '}
              <span className='text-foreground'>{invitePayload.workspace}</span>
            </p>
            <p>
              <span className='font-medium'>{dict.invite.yourEmail}:</span>{' '}
              <span className='text-foreground'>{invitePayload.email}</span>
            </p>
            <p>
              <span className='font-medium'>{dict.invite.yourPhone}:</span>{' '}
              <span className='text-foreground'>{invitePayload.phone}</span>
            </p>
            {invitePayload.company && (
              <p>
                <span className='font-medium'>{dict.invite.yourCompany}:</span>{' '}
                <span className='text-foreground'>{invitePayload.company}</span>
              </p>
            )}
          </div>

          <Separator />

          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
}
