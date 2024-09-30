'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import { TbDownload, TbUpload } from 'react-icons/tb';

import CodeMirrorEditor from '@/components/bucket/editor/partials/CodeMirrorEditor';
import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import QueryResults from '@/components/query/QueryResults';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/core/Repository';

import CollectionSchema from './CollectionSchema';
import CollectionSelector from './CollectionSelector';
import UploadCollectionModalContent from './UploadCollectionModalContent';

/**
 * Repository viewer section, provides UI for the Repository viewer Page.
 */
export default function RepositorySection({
  repository,
  initialRef,
  immutable,
}: {
  repository?: Repository;
  initialRef?: string;
  immutable?: boolean;
}) {
  const { dict, locale } = useLocale();

  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();
  const {
    runScript,
    runningScript,
    scriptResult,
    currentRef,
    currentRepository,
    defaultBranch,
    setCurrentRef,
    loadingCollections,
    collections,
  } = useData();

  const { irminModal } = usePopup();

  const [selectedCollectionID, setSelectedCollectionID] = useState<
    string | null
  >(null);
  const selectedCollection = useMemo(
    () => collections?.find((item) => item.id === selectedCollectionID),
    [selectedCollectionID, collections]
  );
  const [query, setQuery] = useState<string>('');
  const [queryChanged, setQueryChanged] = useState(false);

  /**
   * Set the initial query when the selected collection changes.
   * Skip if the query has been changed by the user or if there is no selected collection.
   */
  useEffect(() => {
    if (!selectedCollection) return;
    if (queryChanged) return;
    setQuery(
      `SELECT * FROM $["${selectedCollection.formatted_name}${currentRef ? `@${currentRef}` : ''}"]`
    );
  }, [selectedCollection, queryChanged, currentRef]);

  useEffect(() => {
    setCurrentRef(initialRef);
  }, [initialRef, setCurrentRef]);

  const handleUpload = useCallback(() => {
    irminModal.show(
      dict.repository.uploadCollection,
      <UploadCollectionModalContent
        currentRepository={currentRepository}
        currentRef={currentRef}
      />
    );
  }, [currentRef, currentRepository, dict, irminModal]);

  const runCurrentQuery = useCallback(() => {
    if (!query || query.length < 3) return;
    runScript(
      'sql',
      query,
      collections.find((item) => item.id === selectedCollectionID)
    );
  }, [query, runScript, selectedCollectionID, collections]);

  const updateQuery = useCallback(
    (value: string) => {
      if (runningScript) return;
      setQueryChanged(true);
      setQuery(value);
    },
    [runningScript]
  );

  return (
    <>
      <div className='container relative mx-auto mb-4 flex max-w-6xl flex-col gap-4 px-2 md:px-4'>
        <div className='flex w-full flex-wrap items-center justify-between gap-4'>
          <div className='inline max-w-full overflow-x-scroll whitespace-nowrap text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            <Link
              className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
              href={`/${locale}/console/${currentWorkspace?.slug}/repositories`}
            >
              {currentWorkspace?.slug}
            </Link>
            {' / '}
            <Link
              className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
              href={`/${locale}/console/${currentWorkspace?.slug}/repositories/${repository?.slug}`}
            >
              {repository?.slug}
            </Link>
            {currentRef ? ` @ ${currentRef}` : ` @ ${defaultBranch}`}
          </div>
          <div className='flex items-center gap-2 md:gap-4'>
            <Button
              colorScheme='light'
              variant='solid'
              size='sm'
              icon={<TbDownload />}
              href={`/${locale}/console/${currentWorkspace?.slug}/repositories/${repository?.slug}/download`}
            >
              {dict.repository.download.download}
            </Button>
            {repository && !repository.is_immutable && !immutable && (
              <Button
                onClick={handleUpload}
                colorScheme='light'
                variant='solid'
                size='sm'
                icon={<TbUpload />}
              >
                {dict.repository.uploadCollection}
              </Button>
            )}
          </div>
        </div>
        {loadingCollections ? (
          <LoadingSkeleton className='h-96' />
        ) : (
          <div className='flex w-full flex-col items-start gap-1 md:flex-row md:gap-2'>
            {repository && (
              <CollectionSelector
                repository={repository}
                collections={collections}
                selectedCollectionID={selectedCollectionID}
                setSelectedCollectionID={setSelectedCollectionID}
              />
            )}
            {selectedCollectionID && (
              <CollectionSchema
                collectionID={selectedCollectionID}
                immutable={immutable ?? repository?.is_immutable ?? false}
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
              loading={runningScript}
              onClick={runCurrentQuery}
            >
              {dict.repository.runQuery}
            </Button>
          </div>
          <CodeMirrorEditor
            language='sql'
            content={query}
            editorHeight='100px'
            updateEditorContent={updateQuery}
            placeholder={dict.editor.writeYourSQL}
            className='h-full w-full text-sm outline-none md:text-sm lg:text-base'
          />
        </div>
      </div>
      {scriptResult && (
        <div className='flex h-[calc(100vh-400px)] min-h-96'>
          <QueryResults
            title={dict.query.queryResults}
            result={scriptResult}
            loading={runningScript}
          />
        </div>
      )}
    </>
  );
}
