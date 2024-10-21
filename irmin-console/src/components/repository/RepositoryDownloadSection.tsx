'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import IrminCore from '@/lib/core';
import { Locale } from '@/lib/dict';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import {
  convertToText,
  downloadContent,
  getContentType,
} from '@/utils/content';

const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

/**
 * UI to download a repository or specific collections at a specific ref
 */
export default function RepositoryDownloadSection({
  irminCore,
  workspaceSlug,
  repositorySlug,
  locale,
}: {
  irminCore: IrminCore;
  workspaceSlug: string;
  repositorySlug: string;
  locale: Locale;
}) {
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
    const redirectSuccessUrl = `${appBaseUrl}/${locale}/console/${workspaceSlug}/repositories/${repositorySlug}/download/success`;
    const redirectFailedUrl = `${appBaseUrl}/${locale}/console/${workspaceSlug}/repositories/${repositorySlug}/download/failed`;
    try {
      if (collections && collections.length > 0) {
        // More than zero collections selected, fetch them one by one
        const fetches = [];
        for (let i = 0; i < collections.length; i++) {
          const collection = collections[i];
          fetches.push(
            irminCore.collectionService.fetchContent({
              repository: repositorySlug,
              collection: collection,
              ref: targetRef,
            })
          );
        }
        const responses = await Promise.all(fetches);
        // Download the content one by one
        for (let i = 0; i < responses.length; i++) {
          const res = responses[i];
          const collection = collections[i];
          const textContent = convertToText(res);
          const contentType = getContentType(res);
          downloadContent(
            textContent ? textContent : (res as Blob),
            contentType,
            `${repositorySlug}_${collection}`
          );
        }
      } else {
        // If no collections are selected, download the entire repository
        const res = await irminCore.collectionService.fetchContent({
          repository: repositorySlug,
          ref: targetRef,
        });
        const textContent = convertToText(res);
        const contentType = getContentType(res);
        downloadContent(
          textContent ? textContent : (res as Blob),
          contentType,
          `${repositorySlug}`
        );
      }
      // Redirect the user to the success page
      router.push(redirectSuccessUrl);
    } catch (error) {
      console.error('RepositoryDownloadPage download error', error);
      // Redirect the user to the failed page
      router.push(redirectFailedUrl);
    }
  }, [
    router,
    collections,
    locale,
    repositorySlug,
    workspaceSlug,
    irminCore,
    targetRef,
  ]);

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
