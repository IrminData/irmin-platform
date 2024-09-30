'use client';

import { useEffect, useRef } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useData } from '@/context/DataContext';

import { RepositoryRouteParams } from '../layout';

/**
 * Page from where the user will be directed to download the repository
 * or part of it
 */
export default function RepositoryDownloadPage({
  params,
}: {
  params: RepositoryRouteParams;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collection = searchParams.get('collection') ?? '';

  const { downloadRepository } = useData();
  const downloaded = useRef(false);

  useEffect(() => {
    if (
      params.repository &&
      params.workspace &&
      params.lang &&
      !downloaded.current
    ) {
      // Make sure the repository is only downloaded once
      downloaded.current = true;
      // Construct the URL to redirect the user to after downloading the repository
      const appBaseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';
      const redirectSuccessUrl = `${appBaseUrl}/${params.lang}/console/${params.workspace}/repositories/${params.repository}/download/success`;
      const redirectFailedUrl = `${appBaseUrl}/${params.lang}/console/${params.workspace}/repositories/${params.repository}/download/failed`;
      // Download the repository from the server
      downloadRepository(collection, redirectSuccessUrl, redirectFailedUrl);
      // Redirect the user to the previous page
      router.back();
    }
  }, [params, downloadRepository, router, collection]);

  return (
    <div className='container relative mx-auto max-w-6xl py-12'>
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
