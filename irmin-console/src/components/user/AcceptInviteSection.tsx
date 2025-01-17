'use client';

import { useCallback, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { User } from '@clerk/nextjs/server';

import { TbCheck, TbLogin, TbX } from 'react-icons/tb';

import { acceptInvite, declineInvite } from '@/lib/actions/invites';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { Separator } from '@/components/ui/separator';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { InviteSignedURLPayload } from '@/types/core/Invite';

const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://irmin.dev';

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
          <div className='flex w-full flex-col gap-2'>
            <Button
              variant='outline'
              onClick={handleDecline}
              disabled={isLoading}
              className='w-full'
            >
              <TbX className='mr-2 h-4 w-4' /> {dict.invite.declineInvitation}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isLoading || !password || !confirmPassword}
              className='w-full'
            >
              <TbCheck className='mr-2 h-4 w-4' />{' '}
              {dict.invite.acceptAndCreateAccount}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className='flex w-full flex-col gap-2'>
        <Button
          variant='outline'
          onClick={handleDecline}
          disabled={isLoading}
          className='w-full'
        >
          <TbX className='mr-2 h-4 w-4' /> {dict.invite.declineInvitation}
        </Button>
        <Button onClick={handleAccept} disabled={isLoading} className='w-full'>
          <TbCheck className='mr-2 h-4 w-4' /> {dict.invite.acceptInvitation}
        </Button>
      </div>
    );
  };

  return (
    <div
      id='sign-in-section'
      className='mx-auto flex h-full flex-col justify-center gap-8 px-4 py-16 md:mb-0 md:py-28'
    >
      <div className='flex w-full flex-row justify-between gap-4 px-4'>
        <Link
          href={websiteUrl}
          className='transition-all hover:opacity-80'
          aria-label='Go to website'
        >
          <Image
            className='h-9 min-h-5 w-auto dark:hidden'
            src='/irmin-logo.svg'
            alt='Irmin logo'
            width={200}
            height={100}
          />
          <Image
            className='hidden h-9 min-h-5 w-auto dark:block'
            src='/irmin-logo-light.svg'
            alt='Irmin logo'
            width={200}
            height={100}
          />
        </Link>
        <div className='ml-auto'></div>
        <LanguageSwitcher />
        <ThemeSwitch />
      </div>
      <div className='w-screen max-w-sm space-y-4 rounded bg-background p-4'>
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
          <p className='flex justify-between'>
            <span className='font-medium'>{dict.invite.invitedBy}:</span>{' '}
            <span className='text-foreground'>{invitePayload.inviter}</span>
          </p>
          <p className='flex justify-between'>
            <span className='font-medium'>{dict.invite.workspace}:</span>{' '}
            <span className='text-foreground'>{invitePayload.workspace}</span>
          </p>
          <p className='flex justify-between'>
            <span className='font-medium'>{dict.invite.yourEmail}:</span>{' '}
            <span className='text-foreground'>{invitePayload.email}</span>
          </p>
          <p className='flex justify-between'>
            <span className='font-medium'>{dict.invite.yourPhone}:</span>{' '}
            <span className='text-foreground'>{invitePayload.phone}</span>
          </p>
          {invitePayload.company && (
            <p className='flex justify-between'>
              <span className='font-medium'>{dict.invite.yourCompany}:</span>{' '}
              <span className='text-foreground'>{invitePayload.company}</span>
            </p>
          )}
        </div>

        <Separator />

        {renderActionButtons()}
      </div>
    </div>
  );
}
