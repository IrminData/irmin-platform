'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import { TbChevronUp } from 'react-icons/tb';

import CodeMirrorEditor from '@/components/editor/ide/CodeMirrorEditor';
import QueryResults from '@/components/query/QueryResults';
import Button from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useQuery } from '@/context/QueryContext';
import { useRepository } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';
import { Object } from '@/types/core/Object';
import { ContentType } from '@/types/examples/core/content';

import ObjectDetails from './objects/ObjectDetails';
import ObjectViewer from './objects/ObjectViewer';

/**
 * Section for viewing the content of a specific object in a repository
 *
 * @param props - Component properties
 * @param props.currentWorkspace - Slug of the current workspace
 * @param props.selectedObject - The repository object being displayed
 */
const RepositoryObjectViewerSection = ({
  currentWorkspace,
  selectedObject,
}: {
  currentWorkspace: string;
  selectedObject: Object;
}) => {
  const { dict } = useLocale();
  const { getObjectContent, currentRepository, currentRef } = useRepository();
  const query = useQuery();
  const [queryResultsOpen, setQueryResultsOpen] = useState(false);
  const [queryField, setQueryField] = useState<string>('');
  const [objectContent, setObjectContent] = useState<
    IrminAPIBinaryResponse | undefined
  >(undefined);
  const loadingObjectContent = useRef(false);

  /**
   * Hook to fetch the content for the object being viewed
   */
  useEffect(() => {
    if (objectContent || loadingObjectContent.current) return;
    loadingObjectContent.current = true;
    (async () => {
      try {
        const type =
          selectedObject.type === 'binary'
            ? ContentType.image
            : ContentType.json;
        const fetchedContent = await getObjectContent(
          selectedObject.path,
          false,
          type
        );
        setObjectContent(fetchedContent);
      } catch (error) {
        console.error('Failed to fetch object content', error);
      } finally {
        loadingObjectContent.current = false;
      }
    })();
  }, [getObjectContent, selectedObject, objectContent]);

  /**
   * Set the initial query when the selected object changes.
   * Skip if the query has been changed by the user or if there is no selected object.
   */
  useEffect(() => {
    setQueryField(
      `SELECT * FROM $["${currentRepository.slug}.${selectedObject.path.replaceAll('/', '.')}${currentRef ? `@${currentRef}` : ''}"]`
    );
  }, [currentRepository, selectedObject, currentRef]);

  /** Hook to run the currently written query and show the results of that query */
  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    query.executeScript('sql', queryField);
    setQueryResultsOpen(true);
  }, [queryField, query]);

  /** The base URL for the workspace, eg. /en/workspace/workspace-slug */
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <>
      <div className='container relative mx-auto mb-4 flex max-w-7xl flex-col gap-4 px-2 md:px-4'>
        <div
          className={`flex flex-col items-start gap-4 lg:flex-row ${selectedObject.type === 'structured' ? 'justify-between' : 'justify-end'}`}
        >
          {selectedObject.type === 'structured' && (
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
                updateEditorContent={setQueryField}
              />
            </div>
          )}
          <ObjectDetails
            selectedObject={selectedObject}
            hideViewButton={true}
          />
        </div>
        {queryResultsOpen ? (
          <Button
            variant='gray'
            size='sm'
            className='w-full text-pretty capitalize'
            onClick={() => setQueryResultsOpen(false)}
            icon={<TbChevronUp className='text-xl' />}
          >
            {dict.common.close} {dict.query.queryResults}
          </Button>
        ) : (
          <div className='flex w-full flex-wrap items-center justify-between gap-4'>
            <div className='inline max-w-full overflow-x-scroll whitespace-nowrap text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
              <Link
                className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
                href={`${workspaceUrl}/repositories`}
              >
                {currentWorkspace}
              </Link>
              {' / '}
              <Link
                className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
                href={`${workspaceUrl}/repositories/${currentRepository.slug}`}
              >
                {currentRepository.slug}
              </Link>
              {`/ ${selectedObject.path.substring(1)}`}
              {currentRef && ` @ ${currentRef}`}
            </div>
          </div>
        )}
      </div>
      {!queryResultsOpen && (
        <>
          {objectContent ? (
            <div className='w-full rounded bg-background'>
              <ObjectViewer
                object={selectedObject}
                objectContent={objectContent}
              />
            </div>
          ) : (
            <LoadingSkeleton className='h-96 w-full' />
          )}
        </>
      )}
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
};

export default RepositoryObjectViewerSection;
