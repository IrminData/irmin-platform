'use client';

import Image from 'next/image';
import Link from 'next/link';

import { TbCheck, TbX } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import { Separator } from '@/components/ui/separator';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

import { useLocale } from '@/context/LocaleContext';

import { useInvite } from '@/hooks/useInvite';

const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://irmin.dev';

export default function AcceptInviteSection({
  inviteID,
}: {
  inviteID: string;
}) {
  const { dict } = useLocale();
  const { inviteQuery, acceptInviteMutation, declineInviteMutation } =
    useInvite(inviteID);

  if (inviteQuery.isLoading) {
    return (
      <div className='container mx-auto my-8 max-w-3xl'>
        <div className='flex items-center justify-center'>
          <LoadingSkeleton className='h-80 w-full' />
        </div>
      </div>
    );
  }

  if (inviteQuery.isError || !inviteQuery.data?.data) {
    return (
      <div className='container mx-auto my-8 max-w-3xl'>
        <div
          className='rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700'
          role='alert'
        >
          <div className='flex gap-4'>
            <TbX className='h-6 w-6 text-red-400' />
            <div>
              <p className='font-bold'>Invalid Invitation</p>
              <p className='text-sm'>
                The invitation link appears to be invalid or expired. Please
                contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const invite = inviteQuery.data.data;

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
      <div className='bg-background w-screen max-w-sm space-y-4 rounded p-4'>
        <div>
          <h2 className='text-foreground text-2xl font-semibold'>
            {dict.invite.workspaceInvitation}
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            {dict.invite.workspaceInvitationDescription}
          </p>
        </div>

        <Separator />

        <div className='space-y-2 text-sm'>
          <p className='flex justify-between'>
            <span className='font-medium'>{dict.invite.invitedBy}:</span>{' '}
            <span className='text-foreground'>{invite.invited_by.email}</span>
          </p>
          <p className='flex justify-between'>
            <span className='font-medium'>{dict.invite.workspace}:</span>{' '}
            <span className='text-foreground'>{invite.workspace.name}</span>
          </p>
          <p className='flex justify-between'>
            <span className='font-medium'>{dict.invite.role}:</span>{' '}
            <span className='text-foreground'>{invite.role.role}</span>
          </p>
        </div>

        <Separator />

        <div className='flex w-full flex-col gap-2'>
          <Button
            variant='outline'
            onClick={() => declineInviteMutation.mutate(invite.id)}
            disabled={declineInviteMutation.isPending}
            className='w-full'
          >
            <TbX className='mr-2 h-4 w-4' /> {dict.invite.declineInvitation}
          </Button>
          <Button
            onClick={() => acceptInviteMutation.mutate(invite.id)}
            disabled={acceptInviteMutation.isPending}
            className='w-full'
          >
            <TbCheck className='mr-2 h-4 w-4' /> {dict.invite.acceptInvitation}
          </Button>
        </div>

        {acceptInviteMutation.error && (
          <div className='rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700'>
            <div className='flex gap-4'>
              <TbX className='h-6 w-6 text-red-400' />
              <div>
                <p className='font-bold'>{dict.common.ohNo}:</p>
                <p className='text-sm'>{acceptInviteMutation.error.message}</p>
              </div>
            </div>
          </div>
        )}

        {declineInviteMutation.error && (
          <div className='rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700'>
            <div className='flex gap-4'>
              <TbX className='h-6 w-6 text-red-400' />
            </div>
            <div>
              <p className='font-bold'>{dict.common.ohNo}:</p>
              <p className='text-sm'>{declineInviteMutation.error.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
