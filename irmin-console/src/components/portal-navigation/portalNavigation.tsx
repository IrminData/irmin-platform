'use client';

import React, {
  ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState,
} from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { TbChevronLeft, TbChevronRight, TbSearch } from 'react-icons/tb';

import AIAssistantPopup from '@/components/AIAssistantPopup';
import NotificationButton from '@/components/notifications/NotificationButton';
import PortalNavLink from '@/components/portal-navigation/portalNavLink';
import { usePortalNavLinks } from '@/components/portal-navigation/portalNavLinks';
import PortalNavProfile from '@/components/portal-navigation/portalNavProfile';
import PortalNavWorkspaceSwitcher from '@/components/portal-navigation/portalNavWorkspaceSwitcher';

import { useLocale } from '@/context/LocaleContext';

/**
 * Portal navigation component
 *
 * @remarks
 *
 * This component is used to display the portal navigation sidebar and top bar.
 *
 * The sidebar can be folded or unfolded. It contains the navigation links,
 * {@link PortalNavProfile}, and {@link PortalNavWorkspaceSwitcher}.
 *
 * Portal navigation component also contains the search bar and the {@link NotificationButton}.
 *
 * Links are fetched from {@link usePortalNavLinks} context and displayed using {@link PortalNavLink}.
 */
export default function PortalNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { dict } = useLocale();
  const { workspace: workspaceSlug } = useParams();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMenuFolded, setIsMenuFolded] = React.useState(false);
  const [debouncedIsMenuFolded, setDebouncedIsMenuFolded] =
    useState(isMenuFolded);

  const links = usePortalNavLinks();

  const [sideBarWidth, setSideBarWidth] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  /**
   * Update the sidebar width state when the window is resized
   * Used to move the content and nav bar when the sidebar size changes
   * Using a debounce to prevent flickering
   */
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout;
    const currentSidebar = sidebarRef.current;

    const updateSideBarWidth = () => {
      if (currentSidebar) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          setSideBarWidth(currentSidebar.offsetWidth);
        }, 100);
      }
    };

    const resizeObserver = new ResizeObserver(updateSideBarWidth);
    if (currentSidebar) {
      resizeObserver.observe(currentSidebar);
    }
    updateSideBarWidth();

    return () => {
      clearTimeout(debounceTimeout);
      if (currentSidebar) {
        resizeObserver.unobserve(currentSidebar);
      }
    };
  }, []);

  /**
   * Texts in the sidebar are hidden when the sidebar is folded
   * and shown when the sidebar is unfolded.
   *
   * This effect is used to debounce the state change to prevent flickering.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIsMenuFolded(isMenuFolded);
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isMenuFolded]);

  /**
   * Hide instantly when the sidebar is folded.
   * Show with a delay when the sidebar is unfolded.
   *
   * Use {@link isMenuOpen} directly to show instantly when the sidebar is opened.
   */
  const hideItemLabels = isMenuFolded || debouncedIsMenuFolded;

  return (
    <>
      <AIAssistantPopup />
      <div id='dashboard-navigation'>
        {/* Dashboard navigation toggle on mobile */}
        <div className='fixed left-2 top-2 z-50 block md:hidden'>
          <button
            className='relative h-9 w-12 rounded-full bg-irmin_green focus:outline-none'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className='absolute left-4 top-1/2 block w-5 -translate-x-1/2 -translate-y-1/2 transform'>
              <span
                className={`absolute block h-0.5 w-7 transform bg-current text-white transition duration-500 ease-in-out ${
                  isMenuOpen ? 'rotate-45' : '-translate-y-1.5'
                }`}
              ></span>
              <span
                className={`absolute block h-0.5 w-5 transform bg-current text-white transition duration-500 ease-in-out ${
                  isMenuOpen ? 'opacity-0' : ''
                }`}
              ></span>
              <span
                className={`absolute block h-0.5 w-7 transform bg-current text-white transition duration-500 ease-in-out ${
                  isMenuOpen ? '-rotate-45' : 'translate-y-1.5'
                }`}
              ></span>
            </div>
          </button>
        </div>
        {/* Top menu bar */}
        <div
          className={`fixed left-0 right-0 z-40 block transition-all duration-200`}
          style={{
            marginLeft: sideBarWidth,
          }}
        >
          <div className='bg-white px-4 py-1 pl-[80px] shadow-md md:pl-4'>
            <div className='flex w-full'>
              {isMenuFolded && (
                <Link href='/' className='pr-4'>
                  <Image
                    className={'h-[90%]'}
                    src='/irmin-logo.svg'
                    alt='Irmin logo'
                    width={100}
                    height={50}
                  />
                </Link>
              )}
              <form className='ml-auto w-full max-w-sm transition-all focus-within:max-w-full lg:max-w-md'>
                <div className='relative'>
                  <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3'>
                    <TbSearch className='text-gray-500' />
                  </div>
                  <input
                    type='search'
                    id='default-search'
                    className='block w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-3 ps-10 text-xs text-gray-900 focus:outline-none md:text-sm'
                    placeholder={dict.portalNavigation.searchPlaceholder}
                    required
                  />
                  <button
                    type='submit'
                    className='absolute bottom-0 right-0 top-0 rounded-full border border-gray-300 bg-gray-50 px-4 py-3 text-xs font-light text-gray-900 transition-all hover:bg-gray-100 focus:outline-none md:text-sm'
                  >
                    {dict.portalNavigation.search}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* Dashboard navigation sidebar */}
        <div
          ref={sidebarRef}
          className={`scrollbar-hide fixed top-0 z-40 overflow-y-scroll bg-irmin_black transition-all duration-300 ${
            isMenuOpen ? 'block' : 'hidden md:block'
          } ${isMenuFolded ? 'w-20' : 'w-full max-w-80 md:w-2/5 lg:w-1/5'}`}
        >
          <div className={`flex h-screen w-full flex-col justify-between`}>
            <div className='mt-12 md:mt-0'>
              <div className='z-40 flex w-full items-center justify-between p-4 pl-8'>
                {!hideItemLabels && (
                  <div className='block max-w-max'>
                    <Link href='/'>
                      <Image
                        className={'h-[24px]'}
                        src='/irmin-logo-light.svg'
                        alt='Irmin logo'
                        width={100}
                        height={50}
                      />
                    </Link>
                  </div>
                )}
                <button
                  className={`absolute top-[16px] hidden text-irmin_green md:top-[8px] md:block ${
                    !isMenuFolded ? 'right-2' : 'left-7'
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
                  className={`absolute right-10 top-[16x] md:top-[13px] ${hideItemLabels && 'hidden'}`}
                >
                  <NotificationButton />
                </div>
              </div>
              <div className={`px-5 ${hideItemLabels ? 'hidden' : 'block'}`}>
                <PortalNavProfile setIsMenuOpen={setIsMenuOpen} />
                <PortalNavWorkspaceSwitcher setIsMenuOpen={setIsMenuOpen} />
              </div>

              {!workspaceSlug && (
                <div
                  className={isMenuFolded ? 'mt-6' : 'mt-12'}
                  id='portal-links'
                >
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-irmin_green ${
                      isMenuFolded ? 'hidden' : 'block'
                    }`}
                  >
                    {dict.portalNavigation.irminPortal}
                  </p>
                  <ul className='px-4'>
                    {links.noWorkspace.map((link, index) => (
                      <PortalNavLink
                        key={`dashboard-nav-noWorkspace-${index}`}
                        link={link}
                        isMenuFolded={hideItemLabels}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {workspaceSlug && (
                <div
                  className={isMenuFolded ? 'mt-6' : 'mt-12'}
                  id='workspace-links'
                >
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-irmin_green ${
                      isMenuFolded ? 'hidden' : 'block'
                    }`}
                  >
                    {dict.portalNavigation.workspace}
                  </p>
                  <ul className='px-4'>
                    {links.hasWorkspace.map((link, index) => (
                      <PortalNavLink
                        key={`dashboard-nav-hasWorkspace-${index}`}
                        link={link}
                        isMenuFolded={hideItemLabels}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}
              <div
                className={hideItemLabels ? 'mt-0' : 'mt-8'}
                id='settings-links'
              >
                <p
                  className={`px-8 text-xs font-medium uppercase text-irmin_green ${
                    hideItemLabels ? 'hidden' : 'block'
                  }`}
                >
                  {dict.portalNavigation.settings}
                </p>
                <ul className='p-4'>
                  {links.settings.map((link, index) => (
                    <PortalNavLink
                      key={`dashboard-nav-hasWorkspace-${index}`}
                      link={link}
                      isMenuFolded={hideItemLabels}
                      setIsMenuOpen={setIsMenuOpen}
                    />
                  ))}
                </ul>
              </div>
            </div>
            <div className='flex-grow'></div>
            <div
              className={`mt-auto pt-8 ${hideItemLabels && 'hidden'}`}
              id='useful-links'
            >
              <p className={`px-8 text-xs font-medium uppercase text-gray-500`}>
                {dict.portalNavigation.usefulLinks}
              </p>
              <div className='flex flex-col p-4 pl-8'>
                {links.useful.map((link, index) => (
                  <Link
                    key={`dashboard-nav-useful-${index}`}
                    className='mb-4 text-left text-gray-500 transition-colors duration-200 hover:text-gray-200'
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
      {/* Dashboard content */}
      <div
        className={`relative min-h-screen bg-white bg-center pt-[55px] transition-all duration-200`}
        style={{
          marginLeft: sideBarWidth,
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        }}
      >
        {/* Dashboard content */}
        {children}
      </div>
    </>
  );
}
