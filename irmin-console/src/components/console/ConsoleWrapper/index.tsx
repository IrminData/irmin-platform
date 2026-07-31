'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';

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

  // Detect "large screen" = viewport >= 1024px, which is exactly when the
  // sidebar's `lg:hidden` / `lg:relative` classes flip from mobile-overlay
  // mode to persistent-desktop mode. Two gotchas this call has to avoid:
  //
  // 1. useBreakpoint returns `{ 'is@5xl': boolean }` (keyed by capitalized
  //    breakpoint). Without destructuring, the bound value is a truthy
  //    object, which silently breaks every downstream `isLargeScreen ? ...
  //    : ...` and every `!isLargeScreen` check.
  //
  // 2. The custom breakpoint scale in src/utils/tw.ts is container-query
  //    style: `@lg` is 512px (!), `@5xl` is 1024px. Tailwind v4's default
  //    screen `lg:` is 1024px. So to match the CSS, we need `@5xl`, not
  //    `@lg` — using `@lg` would flip isLargeScreen to true at 512px while
  //    the sidebar is still rendering as a mobile overlay, which disables
  //    inert on tablets (512-1023px) and lets focus escape the drawer.
  const { 'is@5xl': isLargeScreen } = useBreakpoint('@5xl');

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
      {/* Mobile drawer backdrop — clickable to close, blocks pointer events.
          aria-hidden + tabIndex=-1 because the real close affordance is the
          hamburger toggle; we don't want AT to announce this button too.
          Gated on !isLargeScreen so the element isn't in the DOM on
          desktop (≥1024px) where the sidebar is always visible and the
          backdrop would be inert chrome. */}
      {isMenuOpen && !isLargeScreen && (
        <button
          type='button'
          aria-hidden='true'
          tabIndex={-1}
          onClick={() => setIsMenuOpen(false)}
          className={`
            fixed inset-0 z-5 block bg-foreground/20 backdrop-blur-xs
            lg:hidden
          `}
        >
          <span className='sr-only'>{dict.consoleNavigation.closeMenu}</span>
        </button>
      )}
      {/* Console wrapper structure */}
      <div className='flex w-screen flex-row items-start justify-start gap-0'>
        {/* Console navigation sidebar. We intentionally do NOT claim
            role='dialog'/aria-modal on mobile — that would advertise an
            ARIA modal dialog pattern we haven't implemented (no focus
            trap, no Escape-to-close, no focus return on close). The
            sidebar is a plain disclosure region; the backdrop handles
            dismissal and inert on content-wrapper confines interaction. */}
        <aside
          id='console-sidebar-wrapper'
          aria-label={dict.consoleNavigation.workspaceNavigationAriaLabel}
          className={`
            scrollbar-hide h-screen overflow-x-hidden overflow-y-scroll
            overscroll-contain border-r border-border bg-background
            transition-[width] duration-150 ease-in-out
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
                    block pt-2 transition-opacity duration-150
                    ${foldMenu ? `hidden opacity-0` : `opacity-100`}
                  `}
                >
                  <Link href='/' aria-label='Go to website home page'>
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
                    lg:block
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
                        -mx-2 flex min-h-9 items-center gap-2 rounded-md px-2
                        text-left text-sm text-muted-foreground
                        transition-colors
                        hover:bg-accent/10 hover:text-foreground
                        focus-visible:ring-1 focus-visible:ring-ring
                        focus-visible:outline-none
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
          inert={isMenuOpen && !isLargeScreen}
          className={`
            flex h-screen max-w-full flex-1 flex-col gap-0 overflow-scroll
            transition-[margin,width] duration-150 ease-in-out
          `}
        >
          {/* Top menu bar */}
          <div
            id='console-top-bar'
            className={`
              z-20 w-full border-b border-border bg-background
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
            id='console-content'
            className={`
              relative min-h-[calc(100vh-4rem)] overflow-y-scroll bg-background
            `}
          >
            <AuthenticationErrorHandler error={authError}>
              {children}
            </AuthenticationErrorHandler>
          </main>
        </div>
      </div>
      {/* Console navigation toggle on mobile */}
      <div
        id='console-navigation-toggle-mobile'
        className={`
          fixed top-1 left-2 z-50 block
          lg:hidden
        `}
      >
        <Button
          className='relative aspect-square size-11'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          size='icon'
          variant='link'
          aria-label={
            isMenuOpen
              ? dict.consoleNavigation.closeMenu
              : dict.consoleNavigation.openMenu
          }
          aria-expanded={isMenuOpen}
          aria-controls='console-sidebar-wrapper'
        >
          <div
            className={`
              absolute top-1/2 left-1/2 block w-5 -translate-1/2 transform
            `}
          >
            <span
              className={`
                absolute block h-0.5 w-7 transform bg-current
                transition-[transform,opacity] duration-200 ease-in-out
                ${isMenuOpen ? 'rotate-45' : '-translate-y-1.5'}
              `}
            />
            <span
              className={`
                absolute block h-0.5 w-5 transform bg-current
                transition-[transform,opacity] duration-200 ease-in-out
                ${isMenuOpen ? 'opacity-0' : ''}
              `}
            />
            <span
              className={`
                absolute block h-0.5 w-7 transform bg-current
                transition-[transform,opacity] duration-200 ease-in-out
                ${isMenuOpen ? '-rotate-45' : 'translate-y-1.5'}
              `}
            />
          </div>
        </Button>
      </div>

      <AssistantSheet currentWorkspace={currentWorkspace} />
    </div>
  );
}
