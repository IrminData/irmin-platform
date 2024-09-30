'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import IrminCore from '@/services/core/IrminCore';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import {
  convertToText,
  downloadContent,
  getContentType,
} from '@/utils/content';

import { RepositoryRouteParams } from '../layout';

const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

/**
 * Page to download a repository or specific collections at a specific ref
 */
export default function RepositoryDownloadPage({
  params,
}: {
  params: RepositoryRouteParams;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const collections = searchParams.getAll('collection');
  const targetRef = searchParams.get('ref') ?? '';

  const downloadStarted = useRef(false);

  /**
   * Download the repository or collections at the target ref
   *
   * Redirects the user to the success or failed page based on the result
   */
  const download = useCallback(async () => {
    // Construct the URL to redirect the user to after downloading the repository
    const redirectSuccessUrl = `${appBaseUrl}/${params.lang}/console/${params.workspace}/repositories/${params.repository}/download/success`;
    const redirectFailedUrl = `${appBaseUrl}/${params.lang}/console/${params.workspace}/repositories/${params.repository}/download/failed`;
    try {
      // Fetch required data
      const { collectionService } = new IrminCore(locale);
      if (collections && collections.length > 0) {
        // More than zero collections selected, fetch them one by one
        const fetches = [];
        for (let i = 0; i < collections.length; i++) {
          const collection = collections[i];
          fetches.push(
            collectionService.fetchContent({
              repository: params.repository,
              collection: collection,
              ref: targetRef,
            })
          );
        }
        const responses = await Promise.all(fetches);
        // Download the content one by one
        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          const collection = collections[i];
          const textContent = convertToText(response);
          const contentType = getContentType(response);
          downloadContent(
            textContent ? textContent : (response as Blob),
            contentType,
            `${params.repository}_${collection}`
          );
        }
      } else {
        // If no collections are selected, download the entire repository
        const response = await collectionService.fetchContent({
          repository: params.repository,
          ref: targetRef,
        });
        const textContent = convertToText(response);
        const contentType = getContentType(response);
        downloadContent(
          textContent ? textContent : (response as Blob),
          contentType,
          `${params.repository}`
        );
      }
      // Redirect the user to the success page
      router.push(redirectSuccessUrl);
    } catch (error) {
      console.error('RepositoryDownloadPage download error', error);
      // Redirect the user to the failed page
      router.push(redirectFailedUrl);
    }
  }, [collections, locale, params, targetRef, router]);

  useEffect(() => {
    if (downloadStarted.current) return;
    downloadStarted.current = true;
    download();
  }, [download]);

  return (
    <div className='container relative mx-auto max-w-6xl py-12'>
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
