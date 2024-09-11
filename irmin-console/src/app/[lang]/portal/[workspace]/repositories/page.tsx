'use client';

import Link from 'next/link';

import { IoAdd } from 'react-icons/io5';

import PortalTitle from '@/components/portal/PortalTitle';
import RepositoryList from '@/components/repository/RepositoryList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal Repositories list page
 *
 * @remarks
 *
 * This page is used to manage Repositories in the portal.
 * It shows a list of Repositories that are available in the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage Repository data.
 */
export default function RepositoriesPage() {
  const { dict } = useLocale();
  const { workspaceLoading, repositories } = useWorkspace();

  const loading = workspaceLoading || repositories.isLoading;

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='flex w-full flex-row items-center justify-between gap-4'>
        <PortalTitle title={dict.portalNavigation.links.repositories} />
        <Link href={'repositories/create'}>
          <button className='group mr-4 mt-2 flex cursor-pointer items-center justify-center transition-all'>
            <p className='-mr-4 flex items-center justify-center rounded-l-full py-2 pl-2 pr-6 text-xs text-gray-500 opacity-0 shadow transition-all group-hover:opacity-100'>
              {dict.repository.createNewRepository}
            </p>
            <p className='flex h-10 w-10 items-center justify-center rounded-full bg-irmin_green text-white transition-all group-hover:bg-irmin_green-600'>
              <IoAdd size={25} />
            </p>
          </button>
        </Link>
      </div>
      <RepositoryList
        loading={loading}
        repositories={repositories.repositories}
      />
    </div>
  );
}
