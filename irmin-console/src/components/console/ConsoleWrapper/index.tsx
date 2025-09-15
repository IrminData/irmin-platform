'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { TbChevronLeft, TbChevronRight, TbCircle } from 'react-icons/tb';

import ConsoleSearch from '@/components/search/ConsoleSearch';
import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { ErrorBoundary } from '@/components/ui/error/ErrorBoundary';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaces } from '@/hooks/api';
import { useBaseUrl, useBreakpoint } from '@/hooks/utils';

import ConsoleNavigationLink from './ConsoleNavigationLink';
import ConsoleNavigationProfile from './ConsoleNavigationProfile';
import ConsoleNavigationWorkspaceSwitcher from './ConsoleNavigationWorkspaceSwitcher';
import useConsoleNavigationLinks from './useConsoleNavigationLinks';

/**
 * Console navigation component
 *
 * @remarks
 *
 * This component is used to display the console navigation sidebar and top bar.
 *
 * The sidebar can be folded or unfolded. It contains the navigation links,
 * {@link ConsoleNavigationProfile}, and {@link ConsoleNavigationWorkspaceSwitcher}.
 *
 * Console navigation component also contains the search bar and the notifications button.
 *
 * Links are fetched from {@link useConsoleNavigationLinks} context and displayed using {@link ConsoleNavigationLink}.
 */
export default function ConsoleWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      level='page'
      title='Console Error'
      description='The console encountered an error. Please try refreshing or contact support if the problem persists.'
    >
      <ConsoleWrapperContent>{children}</ConsoleWrapperContent>
    </ErrorBoundary>
  );
}

function ConsoleWrapperContent({ children }: { children: React.ReactNode }) {
  const { dict } = useLocale();
  const params = useParams<{ workspace?: string }>();
  const { loadingPermissions, ...links } = useConsoleNavigationLinks();

  const isLargeScreen = useBreakpoint('@lg');

  // Assistant URL for floating button
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });
  const assistantUrl = `${workspaceUrl}/assistant`;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuFolded, setIsMenuFolded] = useState(false);

  const { workspacesQuery } = useWorkspaces();

  const loadingWorkspaces = workspacesQuery.isLoading;
  const workspaces = workspacesQuery.data?.data ?? [];
  const currentWorkspace = workspaces?.find(
    (workspace) => workspace.slug === params.workspace
  );

  const foldMenu = isLargeScreen ? isMenuFolded : false;

  return (
    <div className='contents' id='console-wrapper'>
      {/* Console wrapper structure */}
      <div className='flex w-screen flex-row items-start justify-start gap-0'>
        {/* Console navigation sidebar */}
        <div
          id='console-sidebar-wrapper'
          className={`
            scrollbar-hide h-screen overflow-x-hidden overflow-y-scroll border-r
            bg-background transition-all duration-300
            dark:border-gray-800
            ${
              isMenuOpen
                ? 'absolute z-10 block'
                : `
                  hidden
                  lg:relative lg:block
                `
            }
            ${foldMenu ? 'w-20' : 'w-60'}
          `}
        >
          <div
            id='console-sidebar'
            className={`relative flex size-full flex-col justify-between`}
          >
            <div
              id='console-sidebar-main-content'
              className={`
                mt-12 flex flex-col justify-start
                ${foldMenu ? `mt-24 gap-0` : `gap-6`}
                lg:mt-1
              `}
            >
              {/* Logo, notifications and fold button */}
              <div
                id='console-sidebar-header'
                className={`
                  z-40 flex w-full items-center justify-start gap-4 px-4 pt-2
                  md:pl-6
                `}
              >
                <div
                  className={`
                    block pt-2 transition-all duration-300
                    ${foldMenu ? `hidden opacity-0` : `opacity-100`}
                  `}
                >
                  <Link href='/' aria-label='Go to website home page'>
                    <Image
                      className={`
                        block h-[24px]
                        dark:hidden
                      `}
                      src='/irmin-logo.svg'
                      alt='Irmin logo'
                      width={100}
                      height={100}
                    />
                    <Image
                      className={`
                        hidden h-[24px]
                        dark:block
                      `}
                      src='/irmin-logo-light.svg'
                      alt='Irmin logo'
                      width={100}
                      height={100}
                    />
                  </Link>
                </div>
                <Button
                  className={`
                    absolute top-[12px] hidden
                    lg:block
                    ${!foldMenu ? 'right-0' : 'left-7'}
                  `}
                  aria-label='Fold the side navigation'
                  onClick={() => setIsMenuFolded(!foldMenu)}
                  size={'icon'}
                  variant={'link'}
                >
                  {foldMenu ? (
                    <TbChevronRight className='size-6 opacity-60' />
                  ) : (
                    <TbChevronLeft className='size-6 opacity-60' />
                  )}
                </Button>
              </div>

              {/* Profile, theme switch, and notifications button */}
              <div
                id='console-sidebar-profile-theme-switch-notifications'
                className={`
                  flex w-full items-center justify-center px-4
                  ${foldMenu ? `mt-14` : ''}
                `}
              >
                <ConsoleNavigationProfile isMenuFolded={foldMenu} />
              </div>

              {/* Workspace switcher */}
              <div
                id='console-sidebar-workspace-switcher'
                className={`
                  transition-all
                  ${foldMenu ? 'hidden w-0' : `block w-full`}
                `}
              >
                <div className='flex w-full min-w-36 flex-col gap-4 px-4'>
                  <ConsoleNavigationWorkspaceSwitcher
                    workspaces={workspaces}
                    currentWorkspace={currentWorkspace}
                    setIsMenuOpen={setIsMenuOpen}
                  />
                </div>
              </div>

              {foldMenu && <div className='mb-12' />}

              {/* No workspace links */}
              {!currentWorkspace && (
                <div id='console-sidebar-links-no-workspace'>
                  <p
                    className={`
                      mb-2 w-max pl-8 text-xs font-medium text-accent uppercase
                      transition-all duration-300
                      ${foldMenu ? 'hidden opacity-0' : 'opacity-100'}
                    `}
                  >
                    {dict.consoleNavigation.irminConsole}
                  </p>
                  <ul className='px-4'>
                    {links.noWorkspace.map((link) => (
                      <ConsoleNavigationLink
                        key={`console-nav-noWorkspace-${link.title}`}
                        link={link}
                        isMenuFolded={foldMenu}
                        hasWorkspace={currentWorkspace !== undefined}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Workspace links */}
              {loadingWorkspaces && params.workspace && (
                <div className='flex flex-col gap-2 px-4'>
                  <LoadingSkeleton className='h-10 w-full' />
                  <LoadingSkeleton className='h-10 w-full' />
                </div>
              )}
              {currentWorkspace && (
                <div id='console-sidebar-links-workspace'>
                  <p
                    className={`
                      mb-2 w-max pl-8 text-xs font-medium text-accent uppercase
                      transition-all duration-300
                      ${foldMenu ? 'hidden opacity-0' : 'opacity-100'}
                    `}
                  >
                    {dict.consoleNavigation.workspace}
                  </p>
                  {loadingPermissions && (
                    <div className='flex flex-col gap-2 px-4'>
                      <LoadingSkeleton className='h-8 w-full' />
                      <LoadingSkeleton className='h-8 w-full' />
                      <LoadingSkeleton className='h-8 w-full' />
                      <LoadingSkeleton className='h-8 w-full' />
                    </div>
                  )}
                  <ul className='px-4'>
                    {links.hasWorkspace.map((link) => (
                      <ConsoleNavigationLink
                        key={`console-nav-hasWorkspace-${link.title}`}
                        link={link}
                        isMenuFolded={foldMenu}
                        hasWorkspace={currentWorkspace !== undefined}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className='grow' />
            <div
              id='console-sidebar-footer'
              className={`
                mt-auto transition-all
                ${foldMenu ? `mt-24 gap-0` : `gap-6`}
              `}
            >
              <div
                className={`
                  w-full min-w-64 pt-8
                  ${foldMenu ? `hidden w-0 opacity-0` : `block opacity-100`}
                `}
                id='console-sidebar-useful-links'
              >
                <p
                  className={`
                    w-max pl-7 text-xs font-medium text-accent uppercase
                    transition-all duration-300
                  `}
                >
                  {dict.consoleNavigation.usefulLinks}
                </p>
                <div className={`flex flex-col p-4 pl-7`}>
                  {links.useful.map((link) => (
                    <Link
                      key={`console-nav-useful-${link.title}`}
                      className={`
                        mb-2 text-left text-gray-500 transition-colors
                        hover:text-gray-700
                        dark:text-gray-400 dark:hover:text-gray-100
                      `}
                      href={link.href ?? ''}
                      onClick={() => setIsMenuOpen(false)}
                      aria-label={link.title}
                      {...(link.props as ComponentPropsWithoutRef<'a'>)}
                    >
                      <div className={`flex w-full items-center justify-start`}>
                        <div className={'mr-1 text-base'}>{link.icon}</div>
                        <p className={'text-xs font-normal'}>{link.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Console content to the right of the sidebar */}
        <div
          id='console-content-wrapper'
          className={`
            flex h-screen flex-1 flex-col gap-0 transition-all duration-300
            ${
              isMenuOpen
                ? `
                  w-screen blur-xs
                  lg:blur-none
                `
                : ''
            }
            max-w-full overflow-scroll
          `}
        >
          {/* Top menu bar */}
          <div
            id='console-top-bar'
            className={`
              z-20 w-full border-b bg-background
              dark:border-gray-800
              ${
                isMenuOpen
                  ? `pl-0`
                  : `
                    pl-12
                    lg:pl-0
                  `
              }
            `}
          >
            <div
              className={`
                group flex h-14 w-full items-center px-2 py-1
                xl:px-4
              `}
            >
              <div
                className={`
                  py-2 pr-4
                  group-focus-within:hidden
                  ${foldMenu ? `lg:block` : `lg:hidden`}
                `}
              >
                <Image
                  className={`
                    block h-full max-h-4 object-contain
                    md:max-h-6
                    dark:hidden
                  `}
                  src='/irmin-logo.svg'
                  alt='Irmin logo'
                  width={100}
                  height={26}
                />
                <Image
                  className={`
                    hidden h-full max-h-4 object-contain
                    md:max-h-6
                    dark:block
                  `}
                  src='/irmin-logo-light.svg'
                  alt='Irmin logo'
                  width={100}
                  height={26}
                />
              </div>
              <div
                className={`
                  ml-auto w-full max-w-24 transition-all
                  focus-within:max-w-full
                  md:max-w-sm
                  lg:max-w-md
                `}
              >
                <ConsoleSearch />
              </div>
            </div>
          </div>
          {/* Console content */}
          <div
            id='console-content'
            className={`
              relative min-h-[calc(100vh-4rem)] overflow-y-scroll bg-background
            `}
          >
            {children}
          </div>
        </div>
      </div>
      {/* Console navigation toggle on mobile */}
      <div
        id='console-navigation-toggle-mobile'
        className={`
          fixed top-[8px] left-4 z-50 block
          lg:hidden
        `}
      >
        <Button
          className='relative aspect-square size-10'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          size='icon'
          variant='link'
        >
          <div
            className={`
              absolute top-1/2 left-4 block w-5 -translate-1/2 transform
            `}
          >
            <span
              className={`
                absolute block h-0.5 w-7 transform bg-current transition
                duration-500 ease-in-out
                ${isMenuOpen ? 'rotate-45' : '-translate-y-1.5'}
              `}
            />
            <span
              className={`
                absolute block h-0.5 w-5 transform bg-current transition
                duration-500 ease-in-out
                ${isMenuOpen ? 'opacity-0' : ''}
              `}
            />
            <span
              className={`
                absolute block h-0.5 w-7 transform bg-current transition
                duration-500 ease-in-out
                ${isMenuOpen ? '-rotate-45' : 'translate-y-1.5'}
              `}
            />
          </div>
        </Button>
      </div>

      {/* Floating Assistant Button */}
      {currentWorkspace && (
        <div className='fixed right-6 bottom-6 z-50'>
          <ButtonWithTooltip
            href={assistantUrl}
            size='icon'
            variant='gradient'
            tooltip={dict.assistant.title}
            className={`
              size-12 rounded-full shadow-lg transition-all duration-200
              hover:shadow-xl
            `}
            aria-label={dict.assistant.title}
          >
            <TbCircle className='size-6' />
          </ButtonWithTooltip>
        </div>
      )}
    </div>
  );
}
