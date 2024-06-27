'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { IoChevronBackCircleOutline } from 'react-icons/io5';
import { RxDashboard } from 'react-icons/rx';
import { CiDatabase } from 'react-icons/ci';
import { AiOutlineConsoleSql } from 'react-icons/ai';
import {
  TbDatabaseImport,
  TbDatabaseExport,
  TbSettings,
  TbLogout,
  TbSearch,
  TbChevronRight,
  TbChevronLeft,
} from 'react-icons/tb';
import { PiStorefront } from 'react-icons/pi';
import { useProfile } from '@/context/ProfileContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import AuthService from '@/lib/AuthService';
import WorkspaceService from '@/lib/WorkspaceService';
import AIAssistantPopup from '@/components/AIAssistantPopup';
import NotificationButton from '@/components/notifications/NotificationButton';

export default function DashboardNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = useProfile();
  const workspace = useWorkspace();
  const router = useRouter();
  const { workspace: workspaceSlug } = useParams();

  const auth = AuthService.getInstance();
  const workspaceService = WorkspaceService.getInstance();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMenuFolded, setIsMenuFolded] = React.useState(false);
  const [processingWorkspaceSwitch, setProcessingWorkspaceSwitch] =
    React.useState(false);

  if (!profile.profile) {
    return <></>;
  }

  return (
    <>
      <AIAssistantPopup />
      <div id='dashboard-navigation'>
        {/* Dashboard navigation toggle on mobile */}
        <div className='fixed left-4 top-4 z-50 block md:hidden'>
          <button
            className='relative h-14 w-14 rounded-full bg-ash_gray focus:outline-none'
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
          } ${isMenuFolded ? 'md:left-[80px]' : 'md:left-[40%] lg:left-[20%] 2xl:left-[17%]'}`}
        >
          <div className='bg-white px-4 py-4 pl-[80px] shadow-md md:pl-4'>
            <div className='flex w-full justify-end'>
              <form className='w-64 transition-all focus-within:w-full lg:w-96'>
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
                    className='absolute bottom-2.5 end-1.5 rounded-full bg-ash_gray px-4 py-2 text-xs font-light text-white hover:bg-ash_gray-400 focus:outline-none md:text-sm'
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
          className={`fixed top-0 z-40 overflow-y-scroll bg-rich_black transition-all duration-300 ${
            isMenuOpen ? 'block' : 'hidden md:block'
          } ${isMenuFolded ? 'w-20' : 'w-full md:w-2/5 lg:w-1/5 2xl:w-1/6'}`}
        >
          <div className={`flex h-screen w-full flex-col justify-between`}>
            <div className='mt-24 md:mt-4'>
              <div className='z-40 flex w-full items-center justify-between p-4'>
                <div className='block max-w-max'>
                  <Link href='/'>
                    <Image
                      className={isMenuFolded ? 'h-[10px]' : 'h-[24px]'}
                      src='/irmin-logo-light.svg'
                      alt='Irmin logo'
                      width={100}
                      height={50}
                    />
                  </Link>
                </div>
                <button
                  className={`absolute hidden text-ash_gray md:block ${
                    !isMenuFolded
                      ? 'right-2 top-[16px] md:top-[32px]'
                      : '-right-[7px]'
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
                <div className='flex flex-wrap'>
                  <div className='w-auto p-2'>
                    <Link href='/app/profile'>
                      <Image
                        src='/ui-assets/elements/avatar.webp'
                        alt={profile.profile.name ?? ''}
                        width={50}
                        height={50}
                        className='rounded-full'
                      />
                    </Link>
                  </div>
                  <div className='w-auto p-2'>
                    <Link href='/app/profile'>
                      <h2 className='mb-1 text-sm font-semibold text-ash_gray'>
                        {profile.profile.name ?? ''}
                      </h2>
                      <p className='mb-1 text-sm font-light text-ash_gray'>
                        {profile.profile.email ?? ''}
                      </p>
                      <p className='text-xs font-light text-ash_gray'>
                        {profile.profile.company ?? ''}
                      </p>
                    </Link>
                  </div>
                </div>
                <div className='mt-4 block w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-900'>
                  <select
                    className='w-full bg-gray-50'
                    value={
                      workspaceSlug && workspace.currentWorkspace?.id
                        ? workspace.currentWorkspace.id
                        : 'select-workspace'
                    }
                    disabled={processingWorkspaceSwitch}
                    onChange={async (e) => {
                      e.preventDefault();
                      try {
                        if (e.target.value === 'create-new') {
                          router.push('/app');
                          return;
                        }
                        if (e.target.value === 'select-workspace') {
                          return;
                        }
                        const workspaceID = parseInt(e.target.value);
                        const newWorkspace = workspace.workspaces?.find(
                          (w) => w.id === workspaceID
                        );
                        if (newWorkspace) {
                          setProcessingWorkspaceSwitch(true);

                          const switchingToWorkspace =
                            await workspaceService.switchWorkspace(
                              newWorkspace.slug
                            );
                          if (switchingToWorkspace) {
                            workspace.setCurrentWorkspace(switchingToWorkspace);
                            router.push(
                              `/app/${switchingToWorkspace.slug}/dashboards`
                            );
                            setProcessingWorkspaceSwitch(false);
                          } else {
                            console.error('Failed to switch workspace');
                            setProcessingWorkspaceSwitch(false);
                          }
                        }
                      } catch (error) {
                        console.log(error);
                      }
                    }}
                  >
                    <option value={'select-workspace'}>Select workspace</option>
                    {workspace.workspaces?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                    <option key={'create-new'} value={'create-new'}>
                      Create new workspace
                    </option>
                  </select>
                </div>
              </div>
              {!workspaceSlug && (
                <div className={`mt-6`}>
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-ash_gray ${
                      isMenuFolded ? 'hidden' : 'block'
                    }`}
                  >
                    Irmin App
                  </p>
                  <ul className='mb-8 px-4'>
                    <li>
                      <Link
                        className={`flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800`}
                        href={`/app`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <RxDashboard className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Workspaces
                          </p>
                        </div>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800`}
                        href={`/`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <IoChevronBackCircleOutline className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Go to website
                          </p>
                        </div>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
              {workspaceSlug && (
                <div className={`mt-6`}>
                  <p
                    className={`mb-2 px-8 text-xs font-medium uppercase text-ash_gray ${
                      isMenuFolded ? 'hidden' : 'block'
                    }`}
                  >
                    Workspace
                  </p>
                  <ul className='mb-8 px-4'>
                    <li>
                      <Link
                        className={`flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800`}
                        href={`/app/${workspaceSlug}/dashboards`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <RxDashboard className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Dashboards
                          </p>
                        </div>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800`}
                        href={`/app/${workspaceSlug}/data-sets`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <CiDatabase className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Data Sets
                          </p>
                        </div>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className='flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800'
                        href={`/app/${workspaceSlug}/editor`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <AiOutlineConsoleSql className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Editor
                          </p>
                        </div>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800`}
                        href={`/app/${workspaceSlug}/connections`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <TbDatabaseImport className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Connections
                          </p>
                        </div>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className='flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800'
                        href={`/app/${workspaceSlug}/reverse-etl`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <TbDatabaseExport className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Reverse ETL
                          </p>
                        </div>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className='flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800'
                        href={`/app/${workspaceSlug}/settings`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <TbSettings className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Workspace settings
                          </p>
                        </div>
                      </Link>
                    </li>
                    <li>
                      <Link
                        className='flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800'
                        href={`/app/${workspaceSlug}/marketplace`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className='flex items-center'>
                          <PiStorefront className='mr-2 text-xl' />
                          <p
                            className={`text-base font-light ${
                              isMenuFolded ? 'hidden' : 'block'
                            }`}
                          >
                            Marketplace
                          </p>
                        </div>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className='flex-grow'></div>
            <div className='mt-auto pt-6'>
              <p
                className={`px-8 text-xs font-medium uppercase text-ash_gray ${
                  isMenuFolded ? 'hidden' : 'block'
                }`}
              >
                Settings
              </p>
              <ul className='p-4'>
                <li>
                  <Link
                    className='flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800'
                    href='/app/profile'
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className='flex items-center'>
                      <TbSettings className='mr-2 text-xl' />
                      <p
                        className={`text-base font-light ${
                          isMenuFolded ? 'hidden' : 'block'
                        }`}
                      >
                        My Profile
                      </p>
                    </div>
                  </Link>
                </li>
                <li>
                  <button
                    className='flex items-center justify-between rounded-md p-3 py-4 text-ash_gray hover:bg-rich_black hover:text-ash_gray-800'
                    onClick={() => {
                      setIsMenuOpen(false);
                      auth.logout().then(() => {
                        profile.fetchProfile();
                        router.push('/sign-in');
                      });
                    }}
                  >
                    <div className='flex items-center'>
                      <TbLogout className='mr-2 text-xl' />
                      <p
                        className={`text-base font-light ${
                          isMenuFolded ? 'hidden' : 'block'
                        }`}
                      >
                        Sign out
                      </p>
                    </div>
                  </button>
                </li>
                <li className={`mt-4 ${isMenuFolded && 'hidden'}`}>
                  <div className='flex flex-col'>
                    <Link
                      className='mb-4 text-center text-xs font-light text-ash_gray transition-colors duration-200 hover:text-white'
                      href='/contact'
                      target='_blank'
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Contact support
                    </Link>
                    <Link
                      className='mb-4 text-center text-xs font-light text-ash_gray transition-colors duration-200 hover:text-white'
                      href='/legal/privacy-policy'
                      target='_blank'
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      className='mb-4 text-center text-xs font-light text-ash_gray transition-colors duration-200 hover:text-white'
                      href='/legal/terms-of-use'
                      target='_blank'
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Terms of Use
                    </Link>
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
        className={`relative min-h-screen overflow-scroll bg-white pt-[94px] md:px-4 ${
          isMenuFolded
            ? 'md:ml-[80px] md:w-[calc(100%-80px)]'
            : 'md:ml-[40%] md:w-3/5 lg:ml-[20%] lg:w-4/5 2xl:ml-[17%] 2xl:w-5/6'
        }`}
      >
        {/* Dashboard content */}
        {children}
      </div>
    </>
  );
}
