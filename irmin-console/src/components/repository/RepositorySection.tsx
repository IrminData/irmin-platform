'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AiOutlinePlayCircle } from 'react-icons/ai';

import CodeMirrorEditor from '@/components/bucket/editor/partials/CodeMirrorEditor';
import Button from '@/components/common/button/Button';
import QueryResults from '@/components/query/QueryResults';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/api/Repository';

import CollectionColumnsTable from './CollectionColumnsTable';
import CollectionSelector from './CollectionSelector';

/**
 * Repository viewer section, provides UI for the Repository viewer Page.
 */
export default function RepositorySection({
  repository,
}: {
  repository?: Repository;
}) {
  const { dict } = useLocale();
  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();
  const {
    fetchActionSingleResults,
    loadingData,
    dataResults,
    loadingSchema,
    schemaResults,
    currentBranch,
  } = useData();

  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [query, setQuery] = useState<string>('');

  const runCurrentQuery = useCallback(() => {
    if (!query || query.length < 3) return;
    fetchActionSingleResults({
      type: 'sql',
      content: query,
      branch: currentBranch ?? 'main',
    });
  }, [query, fetchActionSingleResults, currentBranch]);

  const updateQuery = useCallback(
    (value: string) => {
      if (loadingData) return;
      setQuery(value);
    },
    [loadingData]
  );

  useEffect(() => {
    if (!selectedCollection) return;
    setQuery(`SELECT * FROM $[${selectedCollection}]`);
  }, [selectedCollection]);

  const selectedCollectionSchema = useMemo(() => {
    if (loadingSchema) return;
    return (
      schemaResults?.data.collections.find((schema) => {
        return schema.name === selectedCollection;
      }) ?? schemaResults?.data.collections[0]
    );
  }, [schemaResults, selectedCollection, loadingSchema]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='mb-4 flex w-full flex-col items-start gap-1 px-2 md:flex-row md:gap-2 md:px-4'>
        <div className='h-full w-max min-w-64 max-w-96 rounded-lg border bg-white pb-4 shadow-sm md:px-4 md:py-2 dark:border-gray-900 dark:bg-gray-800'>
          <p className='mb-0 p-2 text-sm text-irmin_blue md:mb-2 dark:text-irmin_light_green'>
            {dict.repository.collections}
          </p>
          {repository && (
            <CollectionSelector
              repository={repository}
              selectedCollection={selectedCollection}
              setSelectedCollection={setSelectedCollection}
            />
          )}
        </div>
        {selectedCollectionSchema && (
          <div className='h-full w-max min-w-64 max-w-96 rounded-lg border bg-white pb-4 shadow-sm md:px-4 md:py-2 dark:border-gray-900 dark:bg-gray-800'>
            <CollectionColumnsTable
              schema={selectedCollectionSchema}
              hideConstraints={true}
            />
          </div>
        )}
        <div className='w-full max-w-full overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-900 dark:bg-gray-800'>
          <div className='flex w-full flex-row items-center justify-between px-4'>
            <p className='mb-0 text-lg'>{dict.repository.sqlQuery}</p>
            <Button
              colorScheme='primary'
              variant='solid'
              className='float-end m-2 shadow-none'
              size='sm'
              icon={<AiOutlinePlayCircle />}
              loading={loadingData}
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
      <div className='flex h-[calc(100vh-400px)] min-h-96'>
        <QueryResults
          title={
            currentWorkspace && repository
              ? `${currentWorkspace.slug} / ${repository.slug} ${selectedCollection ? `/ ${selectedCollection}` : ''}`
              : ''
          }
          data={dataResults?.result ?? []}
          metadata={{
            rowsReturned: dataResults?.metadata?.rowsReturned,
            timeTaken: dataResults?.metadata?.timeTaken,
          }}
          loading={loadingData}
        />
      </div>
    </div>
  );
}
