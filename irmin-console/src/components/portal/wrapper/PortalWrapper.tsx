'use client';

import React, { ComponentPropsWithoutRef } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

import { TbChevronLeft, TbChevronRight, TbSearch } from 'react-icons/tb';

import AssistantPopup from '@/components/assistant/AssistantPopup';
import PortalNavigationLink from '@/components/portal/wrapper/navigation/PortalNavigationLink';
import PortalNavigationProfile from '@/components/portal/wrapper/navigation/PortalNavigationProfile';
import PortalNavigationWorkspaceSwitcher from '@/components/portal/wrapper/navigation/PortalNavigationWorkspaceSwitcher';
import usePortalNavigationLinks from '@/components/portal/wrapper/navigation/usePortalNavigationLinks';
import NotificationButton from '@/components/portal/wrapper/notifications/NotificationButton';

import { useLocale } from '@/context/LocaleContext';

/**
 * Portal navigation component
 *
 * @remarks
 *
 * This component is used to display the portal navigation sidebar and top bar.
 *
 * The sidebar can be folded or unfolded. It contains the navigation links,
 * {@link PortalNavigationProfile}, and {@link PortalNavigationWorkspaceSwitcher}.
 *
 * Portal navigation component also contains the search bar and the {@link NotificationButton}.
 *
 * Links are fetched from {@link usePortalNavigationLinks} context and displayed using {@link PortalNavigationLink}.
 */
export default function PortalWrapper({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { dict } = useLocale();
  const { workspace: workspaceSlug } = useParams();
  const currentPath = usePathname();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMenuFolded, setIsMenuFolded] = React.useState(false);

  const links = usePortalNavigationLinks();

  // Hide the menu bar logo if on Portal homepage, to avoid showing multiple logos
  const hideLogoOnPortalHome = currentPath.endsWith('/portal');

  return (
    <>
      {/* Portal wrapper structure */}
      <div
        className='flex w-screen flex-row items-start justify-start gap-0'
        id='portal-wrapper'
      >
        {/* Portal navigation sidebar */}
        <div
          id='portal-sidebar-wrapper'
          className={`scrollbar-hide h-screen overflow-y-scroll bg-irmin_black transition-all duration-300 ${
            isMenuOpen ? 'absolute z-10 block' : 'hidden md:relative md:block'
          } ${isMenuFolded ? 'w-20' : 'w-80 min-w-72'}`}
        >
          <div
            id='portal-sidebar'
            className={`relative flex h-full w-full flex-col justify-between`}
          >
            <div
              id='portal-sidebar-main-content'
              className={`mt-12 flex flex-col justify-start ${isMenuFolded ? 'mt-24 gap-0' : 'gap-6'} md:mt-1`}
            >
              {/* Logo, notifications and fold button */}
              <div
                id='portal-sidebar-header'
                className='z-40 flex w-full items-center justify-between px-4 pt-4 md:pl-8'
              >
                <div
                  className={`block transition-all duration-300 ${isMenuFolded ? 'hidden opacity-0' : 'opacity-100'}`}
                >
                  <Link href='/' aria-label='Go to website home page'>
                    <Image
                      className={'h-[24px]'}
                      src='/irmin-logo-light.svg'
                      alt='Irmin logo'
                      width={100}
                      height={50}
                    />
                  </Link>
                </div>
                <button
                  className={`absolute top-[16px] hidden text-irmin_green md:top-[8px] md:block ${
                    !isMenuFolded ? 'right-2' : 'left-6'
                  }`}
                  aria-label='Fold the side navigation'
                  onClick={() => setIsMenuFolded(!isMenuFolded)}
                >
                  {isMenuFolded ? (
                    <TbChevronRight className='text-4xl' />
                  ) : (
                    <TbChevronLeft className='text-4xl' />
                  )}
                </button>
                <div
                  className={`absolute right-10 md:top-[14px] ${isMenuFolded && 'hidden'}`}
                >
                  <NotificationButton />
                </div>
              </div>

              {/* Profile and workspace switcher */}
              <div
                id='portal-sidebar-profile-and-workspace'
                className={`transition-all ${isMenuFolded ? 'hidden w-0' : 'block w-full'}`}
              >
                <div className='w-full min-w-64 px-4'>
                  <PortalNavigationProfile setIsMenuOpen={setIsMenuOpen} />
                  <PortalNavigationWorkspaceSwitcher
                    setIsMenuOpen={setIsMenuOpen}
                  />
                </div>
              </div>

              {isMenuFolded && <div className='mb-12'></div>}

              {/* No workspace links */}
              {!workspaceSlug && (
                <div id='portal-sidebar-links-no-workspace'>
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-gray-500 transition-all duration-300 ${
                      isMenuFolded ? 'hidden opacity-0' : 'opacity-100'
                    }`}
                  >
                    {dict.portalNavigation.irminPortal}
                  </p>
                  <ul className='px-4'>
                    {links.noWorkspace.map((link, index) => (
                      <PortalNavigationLink
                        key={`Portal-nav-noWorkspace-${index}`}
                        link={link}
                        isMenuFolded={isMenuFolded}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Workspace links */}
              {workspaceSlug && (
                <div id='portal-sidebar-links-workspace'>
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-gray-500 transition-all duration-300 ${
                      isMenuFolded ? 'hidden opacity-0' : 'opacity-100'
                    }`}
                  >
                    {dict.portalNavigation.workspace}
                  </p>
                  <ul className='px-4'>
                    {links.hasWorkspace.map((link, index) => (
                      <PortalNavigationLink
                        key={`Portal-nav-hasWorkspace-${index}`}
                        link={link}
                        isMenuFolded={isMenuFolded}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Settings links */}
              <div id='portal-sidebar-links-settings'>
                <p
                  className={`mb-2 px-8 text-xs font-medium uppercase text-gray-500 transition-all duration-300 ${
                    isMenuFolded ? 'hidden opacity-0' : 'opacity-100'
                  }`}
                >
                  {dict.portalNavigation.settings}
                </p>
                <ul className='px-4'>
                  {links.settings.map((link, index) => (
                    <PortalNavigationLink
                      key={`Portal-nav-hasWorkspace-${index}`}
                      link={link}
                      isMenuFolded={isMenuFolded}
                      setIsMenuOpen={setIsMenuOpen}
                    />
                  ))}
                </ul>
              </div>
            </div>
            <div className='flex-grow'></div>
            <div
              id='portal-sidebar-footer'
              className={`mt-auto transition-all ${isMenuFolded ? 'hidden w-0' : 'block w-full'}`}
            >
              <div
                className='w-full min-w-64 pt-8'
                id='portal-sidebar-useful-links'
              >
                <p
                  className={`px-8 text-xs font-medium uppercase text-gray-500`}
                >
                  {dict.portalNavigation.usefulLinks}
                </p>
                <div className='flex flex-col p-4 pb-12 pl-8'>
                  {links.useful.map((link, index) => (
                    <Link
                      key={`Portal-nav-useful-${index}`}
                      className='mb-4 text-left text-gray-500 transition-colors hover:text-gray-200'
                      href={link.href ?? ''}
                      onClick={() => setIsMenuOpen(false)}
                      aria-label={link.title}
                      {...(link.props as ComponentPropsWithoutRef<'a'>)}
                    >
                      <div className={`flex w-full items-center justify-start`}>
                        <div className={'mr-2 text-lg'}>{link.icon}</div>
                        <p className={'text-xs font-light'}>{link.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Portal content to the right of the sidebar */}
        <div
          id='portal-content-wrapper'
          className={`ml-auto flex h-screen flex-grow flex-col gap-0 transition-all duration-300 ${isMenuOpen ? 'w-screen blur-sm md:blur-none' : ''} max-w-full overflow-scroll`}
        >
          {/* Top menu bar */}
          <div
            id='portal-top-bar'
            className={`z-10 w-full bg-white shadow-md md:pl-2 ${isMenuOpen ? 'pl-0' : 'pl-12 md:pl-0'}`}
          >
            <div className='group flex h-14 w-full items-center px-2 py-1'>
              {!hideLogoOnPortalHome && (
                <div
                  className={`py-2 pr-4 group-focus-within:hidden ${isMenuFolded ? 'md:block' : 'md:hidden'}`}
                >
                  <Image
                    className={'h-full max-h-4 object-contain md:max-h-6'}
                    src='/irmin-logo.svg'
                    alt='Irmin logo'
                    width={100}
                    height={26}
                  />
                </div>
              )}
              <form className='ml-auto w-full max-w-24 rounded-full border border-gray-200 transition-all focus-within:max-w-full md:max-w-sm lg:max-w-md'>
                <div className='relative'>
                  <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3'>
                    <TbSearch className='text-gray-500' />
                  </div>
                  <input
                    type='search'
                    className='block w-full rounded-full bg-gray-50 bg-opacity-50 px-4 py-3 ps-10 text-xs text-gray-900 placeholder:invisible focus:outline-none group-focus-within:placeholder:visible md:text-sm md:placeholder:visible'
                    placeholder={dict.portalNavigation.searchPlaceholder}
                  />
                  <button
                    type='button'
                    className='invisible absolute bottom-0 right-0 top-0 rounded-full bg-gray-50 px-4 py-3 text-xs font-light text-gray-800 opacity-0 transition-all hover:bg-gray-100 focus:outline-none group-focus-within:visible group-focus-within:opacity-100 md:visible md:text-sm md:opacity-100'
                  >
                    {dict.portalNavigation.search}
                  </button>
                </div>
              </form>
            </div>
          </div>
          {/* Portal content */}
          <div
            id='portal-content'
            className={`relative flex-grow bg-white bg-center`}
            style={{
              backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
            }}
          >
            {/* Portal content */}
            {children}
          </div>
        </div>
      </div>
      {/* Portal navigation toggle on mobile */}
      <div
        id='portal-navigation-toggle-mobile'
        className='fixed left-4 top-[8px] z-50 block md:hidden'
      >
        <button
          className='relative aspect-square h-10 w-10 rounded-full bg-gray-200 bg-opacity-10 focus:outline-none'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div
            className={`absolute left-4 top-1/2 block w-5 -translate-x-1/2 -translate-y-1/2 transform ${
              isMenuOpen ? 'text-irmin_green' : 'text-irmin_blue'
            }`}
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
        </button>
      </div>
      {/* Portal AI Assistant popup */}
      <div id='portal-assistant-popup'>
        <AssistantPopup />
      </div>
    </>
  );
}
