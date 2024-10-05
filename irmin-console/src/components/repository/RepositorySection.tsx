'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import { TbDownload, TbUpload } from 'react-icons/tb';

import CodeMirrorEditor from '@/components/bucket/editor/partials/CodeMirrorEditor';
import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import QueryResults from '@/components/query/QueryResults';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useQuery } from '@/context/QueryContext';
import { useRepository } from '@/context/RepositoryContext';
import { useWorkspace } from '@/context/workspace';

import useBaseUrl from '@/hooks/useBaseUrl';

import CollectionSchema from './collections/CollectionSchema';
import CollectionSelector from './collections/CollectionSelector';
import UploadCollectionModalContent from './upload/UploadCollectionModalContent';

/**
 * Repository viewer section, provides UI for the Repository viewer Page.
 */
export default function RepositorySection() {
  const { dict } = useLocale();

  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();

  const { currentRef, currentRepository, loadingCollections, collections } =
    useRepository();

  const query = useQuery();

  const { irminModal } = usePopup();

  const [selectedCollectionID, setSelectedCollectionID] = useState<
    string | null
  >(null);
  const selectedCollection = useMemo(
    () => collections?.find((item) => item.id === selectedCollectionID),
    [selectedCollectionID, collections]
  );
  const [queryField, setQueryField] = useState<string>('');
  const [queryChanged, setQueryChanged] = useState(false);

  /**
   * Set the initial query when the selected collection changes.
   * Skip if the query has been changed by the user or if there is no selected collection.
   */
  useEffect(() => {
    if (!selectedCollection) return;
    if (queryChanged) return;
    setQueryField(
      `SELECT * FROM $["${selectedCollection.formatted_name}${currentRef ? `@${currentRef}` : ''}"]`
    );
  }, [selectedCollection, queryChanged, currentRef]);

  const handleUpload = useCallback(() => {
    irminModal.show(
      dict.repository.collections.uploadCollection,
      <UploadCollectionModalContent
        currentRepository={currentRepository.slug}
        currentRef={currentRef}
      />
    );
  }, [currentRef, currentRepository.slug, dict, irminModal]);

  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    query.executeScript(
      'sql',
      queryField,
      collections.find((item) => item.id === selectedCollectionID)
    );
  }, [queryField, query, selectedCollectionID, collections]);

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const updateQuery = useCallback(
    (value: string) => {
      if (query.loading) return;
      setQueryChanged(true);
      setQueryField(value);
    },
    [query.loading]
  );

  return (
    <>
      <div className='container relative mx-auto mb-4 flex max-w-6xl flex-col gap-4 px-2 md:px-4'>
        <div className='flex w-full flex-wrap items-center justify-between gap-4'>
          <div className='inline max-w-full overflow-x-scroll whitespace-nowrap text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            <Link
              className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
              href={`${workspaceUrl}/repositories`}
            >
              {currentWorkspace?.slug}
            </Link>
            {' / '}
            <Link
              className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
              href={`${workspaceUrl}/repositories/${currentRepository.slug}`}
            >
              {currentRepository.slug}
            </Link>
            {currentRef && ` @ ${currentRef}`}
          </div>
          <div className='flex items-center gap-2 md:gap-4'>
            <Button
              colorScheme='light'
              variant='solid'
              size='sm'
              icon={<TbDownload />}
              href={`${workspaceUrl}/repositories/${currentRepository.slug}/download`}
            >
              {dict.misc.download.download}
            </Button>
            {!currentRepository.is_immutable && (
              <Button
                onClick={handleUpload}
                colorScheme='light'
                variant='solid'
                size='sm'
                icon={<TbUpload />}
              >
                {dict.repository.collections.uploadCollection}
              </Button>
            )}
          </div>
        </div>
        {loadingCollections ? (
          <LoadingSkeleton className='h-96' />
        ) : (
          <div className='flex w-full flex-col items-start gap-1 md:flex-row md:gap-2'>
            <CollectionSelector
              repository={currentRepository}
              collections={collections}
              selectedCollectionID={selectedCollectionID}
              setSelectedCollectionID={setSelectedCollectionID}
            />
            {selectedCollectionID && (
              <CollectionSchema
                collectionID={selectedCollectionID}
                immutable={currentRepository.is_immutable ?? false}
              />
            )}
          </div>
        )}
        <div className='w-full max-w-full overflow-hidden rounded-md border border-gray-100 bg-white dark:border-gray-800 dark:bg-irmin_black'>
          <div className='flex w-full flex-row items-center justify-between bg-gray-100 pl-4 dark:bg-gray-800'>
            <div className='py-2 text-sm font-semibold'>
              {dict.repository.sqlQuery}
            </div>
            <Button
              colorScheme='primary'
              variant='solid'
              className='float-end m-2 shadow-none'
              size='sm'
              icon={<AiOutlinePlayCircle />}
              loading={query.loading}
              onClick={runCurrentQuery}
            >
              {dict.repository.runQuery}
            </Button>
          </div>
          <CodeMirrorEditor
            language='sql'
            content={queryField}
            editorHeight='100px'
            updateEditorContent={updateQuery}
            placeholder={dict.editor.writeYourSQL}
            className='h-full w-full text-sm outline-none md:text-sm lg:text-base'
          />
        </div>
      </div>
      {query.result && (
        <div className='flex h-[calc(100vh-400px)] min-h-96'>
          <QueryResults
            title={dict.query.queryResults}
            result={query.result}
            loading={query.loading}
          />
        </div>
      )}
    </>
  );
}
