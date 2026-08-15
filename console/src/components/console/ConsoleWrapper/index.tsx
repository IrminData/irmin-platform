'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';

import { Logo } from '@/components/Logo/Logo';
import ConsoleSearch from '@/components/search/ConsoleSearch';
import { Button } from '@/components/ui/button';
import AuthenticationErrorHandler from '@/components/ui/error/AuthenticationErrorHandler';
import SafeComponent from '@/components/ui/error/SafeComponent';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { useWorkspaces } from '@/hooks/api';
import { useBreakpoint } from '@/hooks/utils';

import AssistantSheet from './AssistantSheet';
import ConsoleNavigationLink from './ConsoleNavigationLink';
import ConsoleNavigationProfile from './ConsoleNavigationProfile';
import ConsoleNavigationWorkspaceSwitcher from './ConsoleNavigationWorkspaceSwitcher';
import useConsoleNavigationLinks from './useConsoleNavigationLinks';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

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
    <SafeComponent
      level='page'
      titleKey='consoleTitle'
      descriptionKey='consoleDescription'
    >
      <ConsoleWrapperContent>{children}</ConsoleWrapperContent>
    </SafeComponent>
  );
}

function ConsoleWrapperContent({ children }: { children: React.ReactNode }) {
  const { dict } = useLocale();
  const { authError } = useIAM();
  const params = useParams<{ workspace?: string }>();
  const { loadingPermissions, ...links } = useConsoleNavigationLinks();

  // Detect the persistent-sidebar breakpoint (viewport >= 768px), matching
  // the `md:` classes below. Two gotchas this call has to avoid:
  //
  // 1. useBreakpoint returns `{ 'is@3xl': boolean }` (keyed by capitalized
  //    breakpoint). Without destructuring, the bound value is a truthy
  //    object, which silently breaks the responsive state checks below.
  //
  // 2. The custom breakpoint scale in src/utils/tw.ts is container-query
  //    style, so Tailwind's 768px `md:` breakpoint maps to `@3xl` here.
  const { 'is@3xl': isPersistentSidebar } = useBreakpoint('@3xl');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuFolded, setIsMenuFolded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  const { workspacesQuery } = useWorkspaces();

  const loadingWorkspaces = workspacesQuery.isLoading;
  const workspaces = workspacesQuery.data?.data ?? [];
  const currentWorkspace = workspaces?.find(
    (workspace) => workspace.slug === params.workspace
  );

  const foldMenu = isPersistentSidebar ? isMenuFolded : false;
  const mobileMenuOpen = isMenuOpen && !isPersistentSidebar;

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const menuTrigger = menuTriggerRef.current;

    const getFocusableElements = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        (element) =>
          element.getAttribute('aria-hidden') !== 'true' &&
          element.getClientRects().length > 0
      );

    const focusFrame = window.requestAnimationFrame(() => {
      (getFocusableElements()[0] ?? sidebar).focus();
    });

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        sidebar.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (
          activeElement === firstElement ||
          !sidebar.contains(activeElement)
        ) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (
        activeElement === lastElement ||
        !sidebar.contains(activeElement)
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleDialogKeyDown);
      window.requestAnimationFrame(() => menuTrigger?.focus());
    };
  }, [mobileMenuOpen]);

  return (
    <div className='contents' id='console-wrapper'>
      {/* The backdrop is pointer-only dismissal; the close control lives
          inside the modal navigation and is first in its focus order. */}
      {mobileMenuOpen && (
        <div
          aria-hidden='true'
          onClick={() => setIsMenuOpen(false)}
          className={`
            fixed inset-0 z-40 block bg-foreground/20 backdrop-blur-xs
            md:hidden
          `}
        />
      )}
      {/* Console wrapper structure */}
      <div className='flex h-dvh w-full flex-row overflow-hidden'>
        <aside
          ref={sidebarRef}
          id='console-sidebar-wrapper'
          role={mobileMenuOpen ? 'dialog' : undefined}
          aria-modal={mobileMenuOpen ? 'true' : undefined}
          aria-label={dict.consoleNavigation.workspaceNavigationAriaLabel}
          tabIndex={mobileMenuOpen ? -1 : undefined}
          className={`
            scrollbar-hide h-dvh shrink-0 overflow-x-hidden overflow-y-auto
            overscroll-contain border-r border-border bg-background
            transition-[width] duration-150 ease-in-out
            ${
              mobileMenuOpen
                ? 'fixed inset-y-0 left-0 z-50 block'
                : `
                  hidden
                  md:relative md:z-auto md:block
                `
            }
            ${foldMenu ? 'w-20' : 'w-60'}
          `}
        >
          {mobileMenuOpen && (
            <Button
              className='
                absolute top-1 left-2 z-50 aspect-square size-11
                md:hidden
              '
              onClick={() => setIsMenuOpen(false)}
              size='icon'
              variant='link'
              aria-label={dict.consoleNavigation.closeMenu}
            >
              <MobileMenuIcon isOpen />
            </Button>
          )}
          <div
            id='console-sidebar'
            className='relative flex min-h-full w-full flex-col justify-between'
          >
            <div
              id='console-sidebar-main-content'
              className={`
                mt-12 flex flex-col justify-start
                ${foldMenu ? `mt-24 gap-0` : `gap-6`}
                md:mt-1
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
                    block pt-2 transition-opacity duration-150
                    ${foldMenu ? `hidden opacity-0` : `opacity-100`}
                  `}
                >
                  <Link
                    href='/'
                    aria-label={dict.consoleNavigation.irminConsole}
                  >
                    <Logo
                      className='
                        text-[1.25rem]
                        md:text-[1.35rem]
                      '
                    />
                  </Link>
                </div>
                <Button
                  className={`
                    absolute top-[12px] hidden
                    md:block
                    ${!foldMenu ? 'right-0' : 'left-7'}
                  `}
                  aria-label={
                    foldMenu
                      ? dict.consoleNavigation.expandSidebar
                      : dict.consoleNavigation.foldSidebar
                  }
                  aria-expanded={!foldMenu}
                  aria-controls='console-sidebar-wrapper'
                  onClick={() => setIsMenuFolded(!foldMenu)}
                  size={'icon'}
                  variant={'ghost'}
                >
                  {foldMenu ? (
                    <TbChevronRight
                      className='size-6 opacity-60'
                      aria-hidden='true'
                    />
                  ) : (
                    <TbChevronLeft
                      className='size-6 opacity-60'
                      aria-hidden='true'
                    />
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
                  transition-[width] duration-150 ease-in-out
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
                <nav
                  id='console-sidebar-links-no-workspace'
                  aria-label={dict.consoleNavigation.irminConsole}
                >
                  <p
                    className={`
                      mb-2 w-max pl-8 text-[11px] font-medium tracking-wider
                      text-muted-foreground uppercase transition-opacity
                      duration-150
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
                </nav>
              )}

              {/* Workspace links */}
              {loadingWorkspaces && params.workspace && (
                <div className='flex flex-col gap-2 px-4'>
                  <LoadingSkeleton className='h-10 w-full' />
                  <LoadingSkeleton className='h-10 w-full' />
                </div>
              )}
              {currentWorkspace && (
                <nav
                  id='console-sidebar-links-workspace'
                  aria-label={dict.consoleNavigation.workspace}
                >
                  <p
                    className={`
                      mb-2 w-max pl-8 text-[11px] font-medium tracking-wider
                      text-muted-foreground uppercase transition-opacity
                      duration-150
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
                </nav>
              )}
            </div>
            <div className='grow' />
            <div
              id='console-sidebar-footer'
              className={`
                mt-auto transition-[gap]
                ${foldMenu ? `mt-24 gap-0` : `gap-6`}
              `}
            >
              <nav
                aria-label={dict.consoleNavigation.usefulLinks}
                className={`
                  w-full min-w-64 pt-8
                  ${foldMenu ? `hidden w-0 opacity-0` : `block opacity-100`}
                `}
                id='console-sidebar-useful-links'
              >
                <p
                  className={`
                    w-max pl-7 text-[11px] font-medium tracking-wider
                    text-muted-foreground uppercase transition-opacity
                    duration-150
                  `}
                >
                  {dict.consoleNavigation.usefulLinks}
                </p>
                <div className={`flex flex-col p-4 pl-7`}>
                  {links.useful.map((link) => (
                    <Link
                      key={`console-nav-useful-${link.title}`}
                      className={`
                        -mx-2 flex min-h-11 items-center gap-2 rounded-[2px]
                        px-2 text-left text-sm text-muted-foreground
                        transition-colors
                        hover:bg-accent/10 hover:text-foreground
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-accent
                      `}
                      href={link.href ?? ''}
                      onClick={() => setIsMenuOpen(false)}
                      aria-label={link.title}
                      {...(link.props as ComponentPropsWithoutRef<'a'>)}
                    >
                      <span className='text-base' aria-hidden='true'>
                        {link.icon}
                      </span>
                      <span className='font-normal'>{link.title}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </aside>
        {/* Console content to the right of the sidebar.
            On mobile when the drawer is open we mark this region inert so
            keyboard focus, screen-reader navigation and pointer events are
            confined to the drawer (the backdrop above blocks pointer events
            visually; inert blocks them programmatically). */}
        <div
          id='console-content-wrapper'
          inert={mobileMenuOpen}
          className={`
            flex h-dvh max-w-full min-w-0 flex-1 flex-col overflow-hidden
            transition-[margin,width] duration-150 ease-in-out
          `}
        >
          {/* Top menu bar */}
          <div
            id='console-top-bar'
            className={`
              z-20 w-full border-b border-border bg-background
              ${
                mobileMenuOpen
                  ? `pl-0`
                  : `
                    pl-12
                    md:pl-0
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
                  ${foldMenu ? `md:block` : `md:hidden`}
                `}
              >
                <Logo
                  className='
                    text-[1.1rem]
                    md:text-[1.25rem]
                  '
                />
              </div>
              <div
                className={`
                  ml-auto w-full max-w-24 transition-[max-width]
                  focus-within:max-w-full
                  md:max-w-sm
                  lg:max-w-md
                `}
              >
                <ConsoleSearch />
              </div>
            </div>
          </div>
          {/* Console content.
              AuthenticationErrorHandler is scoped to the content area only —
              auth/profile errors surface here without wiping sidebar, nav,
              search, workspace switcher, or theme toggle. Signed-out users
              on protected routes still get redirected to /sign-in (the
              handler's useEffect). */}
          <main
            id='main-content'
            tabIndex={-1}
            className={`relative min-h-0 flex-1 overflow-y-auto bg-background`}
          >
            <div id='console-content' className='contents'>
              <AuthenticationErrorHandler error={authError}>
                {children}
              </AuthenticationErrorHandler>
            </div>
          </main>
        </div>
      </div>
      {/* Console navigation toggle on mobile */}
      <div
        id='console-navigation-toggle-mobile'
        className={`
          fixed top-1 left-2 z-50 block
          md:hidden
          ${mobileMenuOpen ? 'invisible' : ''}
        `}
      >
        <Button
          ref={menuTriggerRef}
          className='relative aspect-square size-11'
          onClick={() => setIsMenuOpen(true)}
          size='icon'
          variant='link'
          aria-label={dict.consoleNavigation.openMenu}
          aria-expanded={mobileMenuOpen}
          aria-controls='console-sidebar-wrapper'
          tabIndex={mobileMenuOpen ? -1 : 0}
        >
          <MobileMenuIcon isOpen={false} />
        </Button>
      </div>

      <div className='contents' inert={mobileMenuOpen}>
        <AssistantSheet currentWorkspace={currentWorkspace} />
      </div>
    </div>
  );
}

function MobileMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      aria-hidden='true'
      className='absolute top-1/2 left-1/2 block w-5 -translate-1/2 transform'
    >
      <span
        className={`
          absolute block h-0.5 w-7 transform bg-current
          transition-[transform,opacity] duration-200 ease-in-out
          ${isOpen ? 'rotate-45' : '-translate-y-1.5'}
        `}
      />
      <span
        className={`
          absolute block h-0.5 w-5 transform bg-current
          transition-[transform,opacity] duration-200 ease-in-out
          ${isOpen ? 'opacity-0' : ''}
        `}
      />
      <span
        className={`
          absolute block h-0.5 w-7 transform bg-current
          transition-[transform,opacity] duration-200 ease-in-out
          ${isOpen ? '-rotate-45' : 'translate-y-1.5'}
        `}
      />
    </span>
  );
}
