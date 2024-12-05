'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import {
  TbChevronUp,
  TbDownload,
  TbFileDiff,
  TbFolderOpen,
  TbUpload,
} from 'react-icons/tb';

import { Dictionary } from '@/lib/dict';

import CodeMirrorEditor from '@/components/editor/ide/CodeMirrorEditor';
import QueryResults from '@/components/query/QueryResults';
import Button from '@/components/ui/button';

import { usePopup } from '@/context/PopupContext';
import { useQuery } from '@/context/QueryContext';
import { useRepository } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Object } from '@/types/core/Object';
import { Workspace } from '@/types/core/Workspace';

import CreateGroupModal from './objects/CreateGroupModal';
import ObjectDetails from './objects/ObjectDetails';
import ObjectList from './objects/ObjectList';
import UploadObjectModal from './objects/UploadObjectModal';

/**
 * Repository viewer section, provides UI for the Repository viewer Page.
 *
 * @param props - The component props
 * @param props.currentWorkspace - The current workspace
 * @param props.dict - The dictionary for the current locale
 */
export default function RepositorySection({
  currentWorkspace,
  dict,
}: {
  currentWorkspace: Workspace;
  dict: Dictionary;
}) {
  const searchParams = useSearchParams();

  const {
    immutable,
    currentRef,
    currentPath,
    currentRepository,
    uploadObject,
    createGroup,
  } = useRepository();

  const query = useQuery();
  const [queryResultsOpen, setQueryResultsOpen] = useState(false);

  const { irminModal } = usePopup();

  const [selectedObject, setSelectedObject] = useState<Object | undefined>();
  const [queryField, setQueryField] = useState<string>('');
  const [queryChanged, setQueryChanged] = useState(false);

  /**
   * Set the initial query when the selected object changes.
   * Skip if the query has been changed by the user or if there is no selected object.
   */
  useEffect(() => {
    if (!selectedObject) return;
    if (queryChanged) return;
    setQueryField(
      `SELECT * FROM $["${currentRepository.slug}.${selectedObject.path.replaceAll('/', '.')}${currentRef ? `@${currentRef}` : ''}"]`
    );
  }, [currentRepository, selectedObject, queryChanged, currentRef]);

  const handleUpload = useCallback(() => {
    irminModal.show(
      dict.repository.objects.uploadObject,
      <UploadObjectModal
        currentPath={currentPath}
        currentRepository={currentRepository.slug}
        currentRef={currentRef ?? 'main'}
        uploadObject={uploadObject}
      />
    );
  }, [
    dict,
    irminModal,
    currentPath,
    currentRepository,
    currentRef,
    uploadObject,
  ]);

  const handleCreateGroup = useCallback(() => {
    irminModal.show(
      dict.repository.objects.createGroup,
      <CreateGroupModal
        currentPath={currentPath}
        currentRepository={currentRepository.slug}
        currentRef={currentRef ?? 'main'}
        createGroup={createGroup}
      />
    );
  }, [
    dict,
    irminModal,
    currentPath,
    currentRepository,
    currentRef,
    createGroup,
  ]);

  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    query.executeScript('sql', queryField);
    setQueryResultsOpen(true);
  }, [queryField, query]);

  /** The base URL for the repository, eg. /en/console/workspace-slug/repositories/repository-slug */
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
            updateEditorContent={updateQuery}
          />
        </div>
        {!queryResultsOpen ? (
          <>
            <div className='my-4 flex w-full flex-wrap items-center justify-between gap-4'>
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
                    variant='secondary'
                    size='sm'
                    onClick={handleCreateGroup}
                    icon={<TbFolderOpen />}
                  >
                    {dict.repository.objects.createGroup}
                  </Button>
                )}
                {!immutable && (
                  <Button
                    variant='default'
                    size='sm'
                    onClick={handleUpload}
                    icon={<TbUpload />}
                  >
                    {dict.repository.objects.uploadObject}
                  </Button>
                )}
              </div>
            </div>
            <div className='flex w-full flex-col items-start gap-2 md:flex-row md:gap-2'>
              <ObjectList selectObject={setSelectedObject} />
              <ObjectDetails
                selectedObject={selectedObject}
                closeDetails={() => setSelectedObject(undefined)}
              />
            </div>
          </>
        ) : (
          <div className='mt-4'>
            <Button
              variant='gray'
              size='sm'
              className='w-full text-pretty capitalize'
              onClick={() => setQueryResultsOpen(false)}
              icon={<TbChevronUp className='text-xl' />}
            >
              {dict.misc.close} {dict.query.queryResults}
            </Button>
          </div>
        )}
      </div>
      {query.result && queryResultsOpen && (
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
