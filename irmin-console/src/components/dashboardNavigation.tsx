'use client';
import React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { RxDashboard } from 'react-icons/rx';
import { CiDatabase } from 'react-icons/ci';
import { AiOutlineConsoleSql } from 'react-icons/ai';
import {
  TbDatabaseImport,
  TbDatabaseExport,
  TbSettings,
  TbBell,
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

import AIAssistantPopup from './AIAssistantPopup';

export default function DashboardNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = useProfile();
  const workspace = useWorkspace();
  const router = useRouter();

  const auth = AuthService.getInstance();
  const workspaceService = WorkspaceService.getInstance();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMenuFolded, setIsMenuFolded] = React.useState(false);
  const [processingWorkspaceSwitch, setProcessingWorkspaceSwitch] =
    React.useState(false);

  if (!profile.profile) {
    return <></>;
  }
  if (!workspace.currentWorkspace) {
    router.push('/app');
    return <></>;
  }

  const workspaceSlug = workspace.currentWorkspace.slug;
  return (
    <>
      <AIAssistantPopup />
      <section className='min-h-full'>
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
        <div
          className={`fixed top-0 z-40 flex h-full flex-col justify-between overflow-y-scroll bg-rich_black transition-all duration-300 ${
            isMenuOpen ? 'block' : 'hidden md:block'
          } ${isMenuFolded ? 'w-20' : 'w-full md:w-2/5 xl:w-1/5'}`}
        >
          <div className='relative mt-24 md:mt-4'>
            <div className='z-40 flex w-full items-center justify-between p-4'>
              <div className='block max-w-max'>
                <Image
                  className='h-8'
                  src='/irmin-logo-light.svg'
                  alt='Irmin logo'
                  width={170}
                  height={100}
                />
              </div>
              <button
                className={`absolute hidden text-ash_gray md:block ${
                  !isMenuFolded ? 'right-2 top-5' : '-right-1 top-5'
                }`}
                onClick={() => setIsMenuFolded(!isMenuFolded)}
              >
                {isMenuFolded ? (
                  <TbChevronRight className='text-2xl' />
                ) : (
                  <TbChevronLeft className='text-2xl' />
                )}
              </button>
              <div
                className={`absolute right-9 top-5 ${isMenuFolded && 'hidden'}`}
              >
                <Link
                  className='block max-w-max text-ash_gray hover:text-ash_gray-800'
                  href='/app/inbox'
                >
                  <TbBell className='text-2xl' />
                </Link>
              </div>
            </div>
            <div className={`mt-8 px-5 ${isMenuFolded ? 'hidden' : 'block'}`}>
              <div className='flex flex-wrap items-center'>
                <div className='flex flex-wrap'>
                  <div className='w-auto p-2'>
                    <Image
                      src='/ui-assets/images/dashboard/navigations/avatar.png'
                      alt={profile.profile.name ?? ''}
                      width={40}
                      height={40}
                      className='rounded-full'
                      objectFit='cover'
                    />
                  </div>
                  <div className='w-auto p-2'>
                    <h2 className='text-sm font-semibold text-ash_gray'>
                      {profile.profile.name ?? ''}
                    </h2>
                    <p className='text-sm font-light text-ash_gray'>
                      {profile.profile.email ?? ''}
                    </p>
                  </div>
                </div>
              </div>
              <div className='mt-4 block w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-900'>
                <select
                  className='w-full bg-gray-50'
                  defaultValue={workspace.currentWorkspace.id}
                  disabled={processingWorkspaceSwitch}
                  onChange={(e) => {
                    e.preventDefault();
                    if (e.target.value === 'create-new') {
                      router.push('/app');
                      return;
                    }
                    const workspaceID = parseInt(e.target.value);
                    const newWorkspace = workspace.workspaces?.find(
                      (w) => w.id === workspaceID
                    );
                    if (newWorkspace) {
                      setProcessingWorkspaceSwitch(true);
                      workspaceService
                        .switchWorkspace(newWorkspace.slug)
                        .then(() => {
                          workspace.setCurrentWorkspace(newWorkspace);
                          router.push(`/app/${newWorkspace.slug}/dashboards`);
                        })
                        .finally(() => {
                          setProcessingWorkspaceSwitch(false);
                        });
                    }
                  }}
                >
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
                    href={`/app/${workspaceSlug}/data-sources`}
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
                    href={`/app/${workspaceSlug}/data-marketplace`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className='flex items-center'>
                      <PiStorefront className='mr-2 text-xl' />
                      <p
                        className={`text-base font-light ${
                          isMenuFolded ? 'hidden' : 'block'
                        }`}
                      >
                        Data marketplace
                      </p>
                    </div>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className='relative flex-1' />
          <div className='relative'>
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
                  href='/app/settings'
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className='flex items-center'>
                    <TbSettings className='mr-2 text-xl' />
                    <p
                      className={`text-base font-light ${
                        isMenuFolded ? 'hidden' : 'block'
                      }`}
                    >
                      Settings
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
        <div
          className={`fixed z-40 w-screen ${
            isMenuOpen ? 'hidden md:block' : ''
          } ${
            isMenuFolded
              ? 'md:ml-[80px] md:w-[calc(100%-80px)]'
              : 'md:ml-[40%] md:w-[3/5] xl:ml-[20%] xl:w-4/5'
          }`}
        >
          <div className='bg-white px-4 py-5 shadow-md'>
            <div className='-m-2 flex flex-wrap items-center justify-between'>
              <div className='w-auto p-2'></div>
              <div className='w-auto p-2'>
                <div className='-m-3 flex flex-wrap items-center'>
                  <div className='flex w-auto justify-end p-3 lg:w-[700px]'>
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
                          className='absolute bottom-2.5 end-1.5 rounded-full bg-ash_gray px-4 py-2 text-xs font-light text-white hover:bg-ash_gray-800 focus:outline-none focus:ring-4 md:text-sm'
                        >
                          Search
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div
        className={`min-h-full px-4 pt-[94px] ${
          isMenuFolded
            ? 'md:ml-[80px] md:w-[calc(100%-80px)]'
            : 'md:ml-[40%] md:w-3/5 xl:ml-[20%] xl:w-4/5'
        }`}
      >
        {/* Dashboard content */}
        {children}
      </div>
    </>
  );
}
