'use client';

import React, { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { IoEnterOutline } from 'react-icons/io5';

import IrminUserButton from '@/components/authentication/IrminUserButton';
import Button from '@/components/ui/button';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { WebsiteNavigationLink } from '@/types/website/WebsiteNavigation';

/**
 * Website navigation link (large screen)
 *
 * @remarks
 *
 * This component is used to display a navigation link in
 * the website navigation.
 *
 * It is used by the WebsiteNavigationContent component, when
 * the screen size is large.
 */
const NavLink = ({
  link,
  linkKey,
}: {
  link: WebsiteNavigationLink;
  linkKey: string;
}) => {
  const pathname = usePathname();
  const isActive = link.href !== '#' && pathname === link.href;
  return (
    <li className='group relative' id={linkKey}>
      <Link
        className={`flex h-full min-h-14 items-center overflow-hidden text-nowrap rounded px-2 py-2 text-xs font-normal text-card-foreground transition-all hover:bg-card group-hover:bg-card lg:text-sm ${isActive ? 'underline' : ''}`}
        aria-label={link.label}
        href={link.href}
      >
        {link.label}
      </Link>
      {link.subpages.length > 0 && (
        <ul className='absolute left-0 -mt-1 hidden w-44 overflow-hidden rounded bg-card py-4 group-hover:block'>
          {link.subpages.map((subpage, idx) => (
            <li
              key={`website-desktop-navigation-link-sublink-${idx}-${linkKey}`}
            >
              <Link
                className={`block overflow-hidden text-nowrap rounded px-2 py-2 text-xs font-normal text-card-foreground transition-all hover:bg-accent/20 lg:text-sm ${isActive ? 'underline' : ''}`}
                aria-label={subpage.label}
                href={subpage.href}
              >
                {subpage.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

/**
 * Website navigation link (small screen)
 *
 * @remarks
 *
 * This component is used to display a navigation link in
 * the website navigation.
 *
 * It is used by the WebsiteNavigationContent component, when
 * the screen size is small.
 */
const MobileNavLink = ({
  link,
  linkKey,
  closeMenu,
}: {
  link: WebsiteNavigationLink;
  linkKey: string;
  closeMenu: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isActive = link.href !== '#' && pathname === link.href;

  return (
    <li className='relative' id={linkKey}>
      <div
        className={`block w-full ${!isOpen && 'border-b'} flex items-center justify-between text-nowrap rounded border-gray-200 px-4 py-2 pb-4 text-base font-normal dark:border-gray-800 ${isActive ? 'text-irmin_green underline dark:text-foreground' : 'text-foreground dark:text-gray-200'}`}
        aria-label={link.label}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Link href={link.href} onClick={closeMenu}>
          {link.label}
        </Link>
        {link.subpages.length > 0 && (
          <span>{isOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
        )}
      </div>
      {isOpen && link.subpages.length > 0 && (
        <ul className='border-b pb-4 pl-4'>
          {link.subpages.map((subpage, idx) => (
            <li
              key={`website-mobile-navigation-link-sublink-${idx}-${linkKey}`}
            >
              <Link
                className='block text-nowrap rounded px-2 py-2 text-base font-normal transition-all hover:bg-gray-200 dark:hover:bg-gray-800'
                aria-label={subpage.label}
                href={subpage.href}
                onClick={closeMenu}
              >
                {subpage.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

/**
 * Website navigation content
 *
 * @remarks
 *
 * This component is used to display the website navigation.
 * It displays the navigation links and user profile.
 *
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 *
 * It handles animations and opening/closing the mobile navigation.
 *
 * This component is used by the WebsiteNavigation component.
 */
export default function WebsiteNavigationContent({
  navLinks,
}: {
  navLinks: {
    [key: string]: WebsiteNavigationLink[];
  };
}) {
  const { dict, locale } = useLocale();
  const { profile, isLoading } = useIAM();
  const [navbarOpen, setNavbarOpen] = React.useState(false);
  const [animate, setAnimate] = React.useState('');

  const links = navLinks[locale] ?? [];

  const closeMenu = () => {
    setAnimate('animate-slideOut');
    setTimeout(() => {
      setNavbarOpen(false);
      setAnimate('');
    }, 300);
  };

  useEffect(() => {
    if (navbarOpen) {
      setAnimate('animate-slideIn');
    }
  }, [navbarOpen]);

  return (
    <>
      <div className='fixed z-40 max-h-[80px] w-full pt-1'>
        <div className='container mx-auto w-full max-w-[calc(80rem+16px)] rounded-xl bg-background bg-opacity-70 px-2 backdrop-blur-md dark:bg-opacity-70 dark:backdrop-blur-md'>
          <div className='w-full max-w-96 px-0 sm:max-w-7xl sm:px-4 xl:px-0'>
            <nav className='flex justify-between'>
              <div className='flex w-full items-center justify-between gap-2'>
                <div className='flex items-center justify-start gap-6'>
                  <Link href='/' className='py-4' aria-label='Go to home page'>
                    <Image
                      className='h-6 min-h-4 w-auto dark:hidden'
                      src='/irmin-logo.svg'
                      alt='Irmin logo'
                      width={100}
                      height={100}
                    />
                    <Image
                      className='hidden h-6 min-h-4 w-auto dark:block'
                      src='/irmin-logo-light.svg'
                      alt='Irmin logo'
                      width={100}
                      height={100}
                    />
                  </Link>
                  <ul className='hidden max-w-full gap-1 py-4 md:flex md:justify-center lg:gap-2'>
                    {links.map((link, idx) => (
                      <NavLink
                        key={`website-desktop-navigation-link-${idx}`}
                        linkKey={`website-desktop-navigation-link-${idx}`}
                        link={link}
                      />
                    ))}
                    <div className='py-2'>
                      <ThemeSwitch />
                    </div>
                  </ul>
                </div>
                <div className='flex items-center justify-end pr-14 md:hidden'>
                  <ThemeSwitch />
                </div>
                {!isLoading && (
                  <div className='hidden flex-row items-center justify-end gap-2 md:flex lg:gap-4'>
                    {profile ? (
                      <>
                        <IrminUserButton />
                        <Button
                          size={'lg'}
                          href='/console'
                          variant='gradient'
                          onClick={closeMenu}
                          className='min-w-32 py-2 text-xs font-normal md:text-sm xl:text-sm'
                        >
                          <IoEnterOutline size={24} className='mr-2' />
                          {dict.website.navigation.goToConsole}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size='lg'
                          variant='secondary'
                          className='min-w-32 py-2 text-xs font-normal md:text-sm xl:text-sm'
                          href='/sign-in'
                          onClick={closeMenu}
                        >
                          {dict.website.navigation.signIn}
                        </Button>
                        <Button
                          size='lg'
                          variant='gradient'
                          className='min-w-32 py-2 pl-6 pr-3 text-xs font-normal md:text-sm xl:text-sm'
                          href='/sign-up'
                          onClick={closeMenu}
                          iconFirst={false}
                          icon={<IoEnterOutline size={24} className='ml-1' />}
                        >
                          {dict.website.navigation.getStarted}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>
      {/* Add a gap to the top of the page, since the nav bar is position fixed */}
      <div className='h-[80px]'></div>
      {/* Mobile navigation */}
      {navbarOpen && (
        <div
          className={`fixed right-0 top-0 z-40 h-full w-full bg-background bg-opacity-10 backdrop-blur-sm dark:bg-black dark:bg-opacity-10 dark:backdrop-blur-sm`}
        >
          <div
            className={`fixed bottom-0 right-0 top-0 w-full max-w-full border-l border-gray-300 bg-background sm:max-w-sm dark:border-gray-800 dark:bg-black ${animate} transition-all duration-300`}
          >
            <nav className='relative flex h-full flex-col justify-start overflow-y-scroll px-4 pb-8 pt-24'>
              <Link
                className='inline-block'
                href='/'
                aria-label='Go to home page'
              >
                <Image
                  className='mx-auto h-8 dark:hidden'
                  src='/irmin-logo.svg'
                  alt='Irmin logo'
                  width={150}
                  height={50}
                />
                <Image
                  className='mx-auto hidden h-8 dark:block'
                  src='/irmin-logo-light.svg'
                  alt='Irmin logo'
                  width={150}
                  height={50}
                />
              </Link>
              <ul className='mt-12 flex flex-col gap-4'>
                {links.map((link, idx) => (
                  <MobileNavLink
                    key={`website-mobile-navigation-link-${idx}`}
                    linkKey={`website-desktop-navigation-link-${idx}`}
                    link={link}
                    closeMenu={closeMenu}
                  />
                ))}
              </ul>
              {!isLoading && (
                <div className='mt-auto flex flex-col'>
                  {profile ? (
                    <Button
                      href='/console'
                      variant='gradient'
                      className='w-full'
                      size={'lg'}
                      onClick={closeMenu}
                    >
                      <IoEnterOutline size={22} className='mr-4' />
                      {dict.website.navigation.goToConsole}
                    </Button>
                  ) : (
                    <div className='flex w-full flex-col items-center justify-stretch gap-2'>
                      <Button
                        variant='secondary'
                        href='/sign-in'
                        onClick={closeMenu}
                        className='w-full'
                        size={'lg'}
                      >
                        {dict.website.navigation.signIn}
                      </Button>
                      <Button
                        href='/sign-up'
                        variant='gradient'
                        onClick={closeMenu}
                        className='w-full'
                        size={'lg'}
                      >
                        <IoEnterOutline size={22} />
                        {dict.website.navigation.getStarted}
                      </Button>
                    </div>
                  )}
                  {profile && (
                    <div className='mt-6 flex w-full flex-row items-center justify-center gap-2'>
                      <IrminUserButton />
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
      {/* Mobile navigation button */}
      <div className='fixed right-2 top-2 z-50 md:hidden'>
        <button
          className='relative aspect-square h-10 w-10 scale-110 transform rounded-full focus:outline-none'
          onClick={() => {
            if (navbarOpen) closeMenu();
            else setNavbarOpen(true);
          }}
          aria-label='Open or close the navigation menu on mobile'
          type='button'
        >
          <span
            className={`absolute block h-0.5 w-7 transform bg-current transition duration-500 ease-in-out ${
              navbarOpen ? 'rotate-45' : '-translate-y-1.5'
            }`}
          ></span>
          <span
            className={`absolute block h-0.5 w-5 transform bg-current transition duration-500 ease-in-out ${
              navbarOpen ? 'opacity-0' : ''
            }`}
          ></span>
          <span
            className={`absolute block h-0.5 w-7 transform bg-current transition duration-500 ease-in-out ${
              navbarOpen ? '-rotate-45' : 'translate-y-1.5'
            }`}
          ></span>
        </button>
      </div>
    </>
  );
}
