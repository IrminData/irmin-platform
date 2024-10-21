'use client';

import { ComponentPropsWithoutRef, useEffect, useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';

import { Dictionary } from '@/lib/dict';

import ConsoleSearch from '@/components/console/ConsoleSearch';
import Button from '@/components/ui/button';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

import { useBreakpoint } from '@/utils/tw';

import { Workspace } from '@/types/core/Workspace';

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
  dict,
  workspaces,
  children,
}: {
  dict: Dictionary;
  workspaces: Workspace[];
  children: React.ReactNode;
}) {
  const params = useParams<{ workspace?: string }>();
  const links = useConsoleNavigationLinks();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuFolded, setIsMenuFolded] = useState(false);

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.slug === params.workspace),
    [params.workspace, workspaces]
  );

  const isLargeScreen = useBreakpoint('lg');
  const foldMenu = useMemo(
    () => (isLargeScreen ? isMenuFolded : false),
    [isLargeScreen, isMenuFolded]
  );

  return (
    <div className='contents' id='console-wrapper'>
      {/* Console wrapper structure */}
      <div className='flex w-screen flex-row items-start justify-start gap-0'>
        {/* Console navigation sidebar */}
        <div
          id='console-sidebar-wrapper'
          className={`scrollbar-hide h-screen overflow-x-hidden overflow-y-scroll border-r bg-background transition-all duration-300 dark:border-gray-800 ${
            isMenuOpen ? 'absolute z-10 block' : 'hidden lg:relative lg:block'
          } ${foldMenu ? 'w-20' : 'w-60'}`}
        >
          <div
            id='console-sidebar'
            className={`relative flex h-full w-full flex-col justify-between`}
          >
            <div
              id='console-sidebar-main-content'
              className={`mt-12 flex flex-col justify-start ${foldMenu ? 'mt-24 gap-0' : 'gap-6'} md:mt-1`}
            >
              {/* Logo, notifications and fold button */}
              <div
                id='console-sidebar-header'
                className='z-40 flex w-full items-center justify-start gap-4 px-4 pt-4 md:pl-6'
              >
                <div
                  className={`block transition-all duration-300 ${foldMenu ? 'hidden opacity-0' : 'opacity-100'}`}
                >
                  <Link href='/' aria-label='Go to website home page'>
                    <Image
                      className={'block h-[24px] dark:hidden'}
                      src='/irmin-logo.svg'
                      alt='Irmin logo'
                      width={100}
                      height={100}
                    />
                    <Image
                      className={'hidden h-[24px] dark:block'}
                      src='/irmin-logo-light.svg'
                      alt='Irmin logo'
                      width={100}
                      height={100}
                    />
                  </Link>
                </div>
                {!foldMenu && (
                  <div className='pl-4'>
                    <ThemeSwitch />
                  </div>
                )}
                <Button
                  className={`absolute top-[16px] hidden lg:top-[18px] lg:block ${
                    !foldMenu ? 'right-0' : 'left-6'
                  }`}
                  aria-label='Fold the side navigation'
                  onClick={() => setIsMenuFolded(!foldMenu)}
                  size={'icon'}
                  variant={'link'}
                >
                  {foldMenu ? (
                    <TbChevronRight className='text-3xl' />
                  ) : (
                    <TbChevronLeft className='text-3xl' />
                  )}
                </Button>
              </div>

              {/* Profile and workspace switcher */}
              <div
                id='console-sidebar-profile-and-workspace'
                className={`transition-all ${foldMenu ? 'hidden w-0' : 'block w-full'}`}
              >
                <div className='w-full min-w-36 px-4'>
                  <ConsoleNavigationProfile setIsMenuOpen={setIsMenuOpen} />
                  <ConsoleNavigationWorkspaceSwitcher
                    workspaces={workspaces}
                    currentWorkspace={currentWorkspace}
                    setIsMenuOpen={setIsMenuOpen}
                  />
                </div>
              </div>

              {foldMenu && <div className='mb-12'></div>}

              {/* No workspace links */}
              {!currentWorkspace && (
                <div id='console-sidebar-links-no-workspace'>
                  <p
                    className={`mb-2 w-max pl-8 text-xs font-medium uppercase text-accent transition-all duration-300 ${
                      foldMenu ? 'hidden opacity-0' : 'opacity-100'
                    }`}
                  >
                    {dict.consoleNavigation.irminConsole}
                  </p>
                  <ul className='px-4'>
                    {links.noWorkspace.map((link, index) => (
                      <ConsoleNavigationLink
                        key={`Console-nav-noWorkspace-${index}`}
                        link={link}
                        isMenuFolded={foldMenu}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Workspace links */}
              {currentWorkspace && (
                <div id='console-sidebar-links-workspace'>
                  <p
                    className={`mb-2 w-max pl-8 text-xs font-medium uppercase text-accent transition-all duration-300 ${
                      foldMenu ? 'hidden opacity-0' : 'opacity-100'
                    }`}
                  >
                    {dict.consoleNavigation.workspace}
                  </p>
                  <ul className='px-4'>
                    {links.hasWorkspace.map((link, index) => (
                      <ConsoleNavigationLink
                        key={`Console-nav-hasWorkspace-${index}`}
                        link={link}
                        isMenuFolded={foldMenu}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Settings links */}
              <div id='console-sidebar-links-settings'>
                <p
                  className={`mb-2 w-max pl-8 text-xs font-medium uppercase text-accent transition-all duration-300 ${
                    foldMenu ? 'hidden opacity-0' : 'opacity-100'
                  }`}
                >
                  {dict.consoleNavigation.settings}
                </p>
                <ul className='px-4'>
                  {links.settings.map((link, index) => (
                    <ConsoleNavigationLink
                      key={`Console-nav-hasWorkspace-${index}`}
                      link={link}
                      isMenuFolded={foldMenu}
                      setIsMenuOpen={setIsMenuOpen}
                    />
                  ))}
                </ul>
              </div>
            </div>
            <div className='flex-grow'></div>
            {foldMenu && (
              <div className='mx-auto mb-8 mt-auto'>
                <ThemeSwitch />
              </div>
            )}
            <div
              id='console-sidebar-footer'
              className={`mt-auto transition-all ${foldMenu ? 'hidden w-0' : 'block w-full'}`}
            >
              <div className='px-6'>
                <LanguageSwitcher />
              </div>
              <div
                className='w-full min-w-64 pt-8'
                id='console-sidebar-useful-links'
              >
                <p
                  className={`w-max pl-8 text-xs font-medium uppercase text-accent transition-all duration-300 ${
                    foldMenu ? 'hidden opacity-0' : 'opacity-100'
                  }`}
                >
                  {dict.consoleNavigation.usefulLinks}
                </p>
                <div className='flex flex-col p-4 pl-8'>
                  {links.useful.map((link, index) => (
                    <Link
                      key={`Console-nav-useful-${index}`}
                      className='mb-2 text-left text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100'
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
          className={`flex h-screen flex-1 flex-col gap-0 transition-all duration-300 ${isMenuOpen ? 'w-screen blur-sm lg:blur-none' : ''} max-w-full overflow-scroll`}
        >
          {/* Top menu bar */}
          <div
            id='console-top-bar'
            className={`z-20 w-full border-b bg-background dark:border-gray-800 ${isMenuOpen ? 'pl-0' : 'pl-12 lg:pl-0'}`}
          >
            <div className='group flex h-14 w-full items-center px-2 py-1 xl:px-4'>
              <div
                className={`py-2 pr-4 group-focus-within:hidden ${foldMenu ? 'lg:block' : 'lg:hidden'}`}
              >
                <Image
                  className={
                    'block h-full max-h-4 object-contain md:max-h-6 dark:hidden'
                  }
                  src='/irmin-logo.svg'
                  alt='Irmin logo'
                  width={100}
                  height={26}
                />
                <Image
                  className={
                    'hidden h-full max-h-4 object-contain md:max-h-6 dark:block'
                  }
                  src='/irmin-logo-light.svg'
                  alt='Irmin logo'
                  width={100}
                  height={26}
                />
              </div>
              <div className='ml-auto w-full max-w-24 transition-all focus-within:max-w-full md:max-w-sm lg:max-w-md'>
                <ConsoleSearch />
              </div>
            </div>
          </div>
          {/* Console content */}
          <div
            id='console-content'
            className='pattern-bg relative min-h-[calc(100vh-4rem)] overflow-y-scroll bg-background bg-contain bg-top bg-no-repeat'
          >
            {children}
          </div>
        </div>
      </div>
      {/* Console navigation toggle on mobile */}
      <div
        id='console-navigation-toggle-mobile'
        className='fixed left-4 top-[8px] z-50 block lg:hidden'
      >
        <Button
          className='relative aspect-square h-10 w-10'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          size='icon'
          variant='link'
        >
          <div
            className={`absolute left-4 top-1/2 block w-5 -translate-x-1/2 -translate-y-1/2 transform`}
          >
            <span
              className={`absolute block h-0.5 w-7 transform bg-current transition duration-500 ease-in-out ${
                isMenuOpen ? 'rotate-45' : '-translate-y-1.5'
              }`}
            ></span>
            <span
              className={`absolute block h-0.5 w-5 transform bg-current transition duration-500 ease-in-out ${
                isMenuOpen ? 'opacity-0' : ''
              }`}
            ></span>
            <span
              className={`absolute block h-0.5 w-7 transform bg-current transition duration-500 ease-in-out ${
                isMenuOpen ? '-rotate-45' : 'translate-y-1.5'
              }`}
            ></span>
          </div>
        </Button>
      </div>
    </div>
  );
}
