'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AiOutlinePlayCircle } from 'react-icons/ai';

import CodeMirrorEditor from '@/components/bucket/editor/partials/CodeMirrorEditor';
import Button from '@/components/common/button/Button';
import QueryResults from '@/components/query/QueryResults';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';

import CollectionSchema from './CollectionSchema';
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
  const [queryChanged, setQueryChanged] = useState(false);

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
      setQueryChanged(true);
      setQuery(value);
    },
    [loadingData]
  );

  useEffect(() => {
    if (!selectedCollection) return;
    if (queryChanged) return;
    setQuery(`SELECT * FROM $[${selectedCollection}]`);
  }, [selectedCollection, queryChanged]);

  const selectedCollectionSchema = useMemo(() => {
    if (loadingSchema) return;
    if (!schemaResults) return;
    if (!selectedCollection) return;
    console.log(schemaResults);
    return schemaResults?.data.find((schema) => {
      return schema.formatted_name === selectedCollection;
    });
  }, [schemaResults, selectedCollection, loadingSchema]);

  return (
    <>
      <div className='container relative mx-auto mb-4 flex max-w-6xl flex-col gap-4 px-2 md:px-4'>
        <div className='flex w-full flex-col items-start gap-1 md:flex-row md:gap-2'>
          {repository && (
            <CollectionSelector
              repository={repository}
              selectedCollection={selectedCollection}
              setSelectedCollection={setSelectedCollection}
            />
          )}
          {selectedCollectionSchema && (
            <CollectionSchema
              collection={selectedCollectionSchema}
              name={selectedCollectionSchema.name}
            />
          )}
        </div>
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
          title={dict.query.queryResults}
          data={dataResults?.result ?? null}
          metadata={dataResults?.metadata ?? {}}
          loading={loadingData}
        />
      </div>
    </>
  );
}
