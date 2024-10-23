'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import { TbDownload, TbFileDiff, TbUpload } from 'react-icons/tb';

import { Dictionary } from '@/lib/dict';

import CodeMirrorEditor from '@/components/editor/ide/CodeMirrorEditor';
import QueryResults from '@/components/query/QueryResults';
import Button from '@/components/ui/button';

import { usePopup } from '@/context/PopupContext';
import { useQuery } from '@/context/QueryContext';
import { useRepository } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Collection } from '@/types/core/Collection';
import { Workflow } from '@/types/core/Workflow';
import { Workspace } from '@/types/core/Workspace';

import CollectionList from './collections/CollectionList';
import CollectionSchema from './collections/CollectionSchema';
import UploadCollectionModal from './UploadCollectionModal';

/**
 * Repository viewer section, provides UI for the Repository viewer Page.
 *
 * @param props - The component props
 * @param props.currentWorkspace - The current workspace
 * @param props.workflows - The workflows available in the workspace
 * @param props.dict - The dictionary for the current locale
 */
export default function RepositorySection({
  currentWorkspace,
  workflows,
  dict,
}: {
  currentWorkspace: Workspace;
  workflows: Workflow[];
  dict: Dictionary;
}) {
  const searchParams = useSearchParams();

  const {
    immutable,
    currentRef,
    currentRepository,
    loadingCollections,
    collections,
    schema,
  } = useRepository();

  const query = useQuery();

  const { irminModal } = usePopup();

  const [selectedCollection, setSelectedCollection] = useState<
    Collection | undefined
  >();
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
      `SELECT * FROM $["${selectedCollection.repository}.${selectedCollection.name}${currentRef ? `@${currentRef}` : ''}"]`
    );
  }, [selectedCollection, queryChanged, currentRef]);

  const handleUpload = useCallback(() => {
    irminModal.show(
      dict.repository.collections.uploadCollection,
      <UploadCollectionModal
        currentRepository={currentRepository.slug}
        currentRef={currentRef}
      />
    );
  }, [currentRef, currentRepository.slug, dict, irminModal]);

  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    query.executeScript('sql', queryField, selectedCollection);
  }, [queryField, query, selectedCollection]);

  // The base URL for the repository, eg. /en/console/workspace-slug/repositories/repository-slug
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

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
      <div className='container relative mx-auto mb-4 flex max-w-6xl flex-col px-2 md:px-4'>
        <div className='mb-4 flex w-full flex-wrap items-center justify-between gap-4'>
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
          <div className='flex items-center gap-2'>
            {/** Button to navigate to uncommited changes of the current branch */}
            {!immutable && (
              <Button
                variant='secondary'
                size='sm'
                href={`${baseUrl}/uncommited-changes?${searchParams.toString()}`}
                icon={<TbFileDiff />}
              >
                {dict.repository.commit.uncommitedChanges}
              </Button>
            )}
            <Button
              variant='secondary'
              size='sm'
              icon={<TbDownload />}
              href={`${workspaceUrl}/repositories/${currentRepository.slug}/download?${searchParams.toString()}`}
            >
              {dict.misc.download.download}
            </Button>
            {!immutable && (
              <Button
                variant='default'
                size='sm'
                onClick={handleUpload}
                icon={<TbUpload />}
              >
                {dict.repository.collections.uploadCollection}
              </Button>
            )}
          </div>
        </div>
        <div className='flex w-full flex-col items-start gap-2 md:flex-row md:gap-2'>
          <div className='max-h-[400px] w-full overflow-scroll'>
            <CollectionList
              collections={collections}
              selectedCollection={selectedCollection}
              setSelectedCollection={setSelectedCollection}
              loading={loadingCollections}
            />
          </div>
          {selectedCollection && (
            <CollectionSchema
              workflows={workflows}
              collection={schema?.find(
                (c) => c.name === selectedCollection.name
              )}
              immutable={immutable}
            />
          )}
        </div>
        <div className='w-full max-w-full overflow-hidden rounded-md border border-gray-100 bg-background dark:border-gray-800'>
          <div className='flex w-full flex-row items-center justify-between bg-gray-100 pl-4 dark:bg-gray-800'>
            <div className='py-2 text-sm font-semibold'>
              {dict.repository.sqlQuery}
            </div>
            <Button
              variant='accent'
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
