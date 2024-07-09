'use client';

import React, { ComponentPropsWithoutRef } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { TbChevronLeft, TbChevronRight, TbSearch } from 'react-icons/tb';

import AIAssistantPopup from '@/components/AIAssistantPopup';
import DashboardNavLink from '@/components/dashboard-navigation/dashboardNavLink';
import { useDashboardNavLinks } from '@/components/dashboard-navigation/dashboardNavLinks';
import DashboardNavProfile from '@/components/dashboard-navigation/dashboardNavProfile';
import DashboardNavWorkspaceSwitcher from '@/components/dashboard-navigation/dashboardNavWorkspaceSwitcher';
import NotificationButton from '@/components/notifications/NotificationButton';

export default function DashboardNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { workspace: workspaceSlug } = useParams();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMenuFolded, setIsMenuFolded] = React.useState(false);

  const links = useDashboardNavLinks();

  return (
    <>
      <AIAssistantPopup />
      <div id='dashboard-navigation'>
        {/* Dashboard navigation toggle on mobile */}
        <div className='fixed left-4 top-4 z-50 block md:hidden'>
          <button
            className='relative h-14 w-14 rounded-full bg-irmin_green focus:outline-none'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className='absolute left-6 top-1/2 block w-5 -translate-x-1/2 -translate-y-1/2 transform'>
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
          className={`fixed left-0 right-0 z-40 ${
            isMenuOpen ? 'hidden md:block' : ''
          } ${isMenuFolded ? 'md:left-[80px]' : 'md:left-[40%] lg:left-[20%]'}`}
        >
          <div className='bg-white px-4 py-4 pl-[80px] shadow-md md:pl-4'>
            <div className='flex w-full justify-end'>
              <form className='w-full max-w-sm transition-all focus-within:max-w-full lg:max-w-md'>
                <div className='relative'>
                  <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3'>
                    <TbSearch className='text-gray-500' />
                  </div>
                  <input
                    type='search'
                    id='default-search'
                    className='block w-full rounded-full border border-gray-300 bg-gray-50 p-4 ps-10 text-xs text-gray-900 focus:outline-none md:text-sm'
                    placeholder='Search Data, Insights, Connectors...'
                    required
                  />
                  <button
                    type='submit'
                    className='absolute bottom-0 right-0 top-0 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-light text-gray-900 transition-all hover:bg-gray-100 focus:outline-none md:text-sm'
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* Dashboard navigation sidebar */}
        <div
          className={`scrollbar-hide fixed top-0 z-40 overflow-y-scroll bg-irmin_black transition-all duration-300 ${
            isMenuOpen ? 'block' : 'hidden md:block'
          } ${isMenuFolded ? 'w-20' : 'w-full md:w-2/5 lg:w-1/5'}`}
        >
          <div className={`flex h-screen w-full flex-col justify-between`}>
            <div className='mt-24 md:mt-4'>
              <div className='z-40 flex w-full items-center justify-between p-4'>
                <div className='block max-w-max'>
                  <Link href='/'>
                    <Image
                      className={isMenuFolded ? 'h-[6px]' : 'h-[24px]'}
                      src='/irmin-logo-light.svg'
                      alt='Irmin logo'
                      width={100}
                      height={50}
                    />
                  </Link>
                </div>
                <button
                  className={`absolute hidden text-irmin_green md:block ${
                    !isMenuFolded
                      ? 'right-2 top-[16px] md:top-[32px]'
                      : '-right-[5px]'
                  }`}
                  onClick={() => setIsMenuFolded(!isMenuFolded)}
                >
                  {isMenuFolded ? (
                    <TbChevronRight className='text-3xl' />
                  ) : (
                    <TbChevronLeft className='text-3xl' />
                  )}
                </button>
                <div
                  className={`absolute right-9 top-[16x] md:top-[32px] ${isMenuFolded && 'hidden'}`}
                >
                  <NotificationButton />
                </div>
              </div>
              <div className={`mt-4 px-5 ${isMenuFolded ? 'hidden' : 'block'}`}>
                <DashboardNavProfile setIsMenuOpen={setIsMenuOpen} />
                <DashboardNavWorkspaceSwitcher setIsMenuOpen={setIsMenuOpen} />
              </div>
              {!workspaceSlug && (
                <div className={`mt-6`}>
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-irmin_green ${
                      isMenuFolded ? 'hidden' : 'block'
                    }`}
                  >
                    Irmin App
                  </p>
                  <ul className='mb-8 px-4'>
                    {links.noWorkspace.map((link, index) => (
                      <DashboardNavLink
                        key={`dashboard-nav-noWorkspace-${index}`}
                        link={link}
                        isMenuFolded={isMenuFolded}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {workspaceSlug && (
                <div className={`mt-6`}>
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-irmin_green ${
                      isMenuFolded ? 'hidden' : 'block'
                    }`}
                  >
                    Workspace
                  </p>
                  <ul className='mb-8 px-4'>
                    {links.hasWorkspace.map((link, index) => (
                      <DashboardNavLink
                        key={`dashboard-nav-hasWorkspace-${index}`}
                        link={link}
                        isMenuFolded={isMenuFolded}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className='flex-grow'></div>
            <div className='mt-auto pt-6'>
              <p
                className={`px-8 text-xs font-medium uppercase text-irmin_green ${
                  isMenuFolded ? 'hidden' : 'block'
                }`}
              >
                Settings
              </p>
              <ul className='p-4'>
                {links.settings.map((link, index) => (
                  <DashboardNavLink
                    key={`dashboard-nav-hasWorkspace-${index}`}
                    link={link}
                    isMenuFolded={isMenuFolded}
                    setIsMenuOpen={setIsMenuOpen}
                  />
                ))}
                <li className={`mt-4 ${isMenuFolded && 'hidden'}`}>
                  <div className='flex flex-col'>
                    {links.bottom.map((link, index) => (
                      <Link
                        key={`dashboard-nav-bottom-${index}`}
                        className='mb-4 text-center text-xs font-light text-irmin_green transition-colors duration-200 hover:text-white'
                        href={link.href ?? ''}
                        onClick={() => setIsMenuOpen(false)}
                        aria-label={link.title}
                        {...(link.props as ComponentPropsWithoutRef<'a'>)}
                      >
                        {link.title}
                      </Link>
                    ))}
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {/* Dashboard content */}
      <div
        style={{
          backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
          backgroundPosition: 'center',
        }}
        className={`relative min-h-screen bg-white pt-[94px] ${
          isMenuFolded
            ? 'md:ml-[80px] md:w-[calc(100%-80px)]'
            : 'md:ml-[40%] md:w-3/5 lg:ml-[20%] lg:w-4/5'
        }`}
      >
        {/* Dashboard content */}
        {children}
      </div>
    </>
  );
}
