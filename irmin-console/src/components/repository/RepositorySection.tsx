'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import { TbDownload, TbUpload } from 'react-icons/tb';

import CodeMirrorEditor from '@/components/bucket/editor/partials/CodeMirrorEditor';
import Button from '@/components/common/button/Button';
import QueryResults from '@/components/query/QueryResults';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Repository } from '@/types/core/Repository';

import CollectionSchema from './CollectionSchema';
import CollectionSelector from './CollectionSelector';
import UploadCollectionModalContent from './UploadCollectionModalContent';

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
    runScript,
    runningScript,
    scriptResult,
    loadingSchema,
    schema,
    currentBranch,
    currentRepository,
  } = useData();

  const { irminModal } = usePopup();

  // Handle upload collection to the repository
  const handleUpload = () => {
    irminModal.show(
      dict.repository.uploadCollection,
      <UploadCollectionModalContent
        currentRepository={currentRepository}
        currentBranch={currentBranch}
      />
    );
  };

  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [query, setQuery] = useState<string>('');
  const [queryChanged, setQueryChanged] = useState(false);

  const runCurrentQuery = useCallback(() => {
    if (!query || query.length < 3) return;
    runScript(
      'sql',
      query,
      currentBranch ?? 'main',
      repository?.collections.find(
        (collection) => collection.formatted_name === selectedCollection
      )
    );
  }, [query, runScript, currentBranch, selectedCollection, repository]);

  const updateQuery = useCallback(
    (value: string) => {
      if (runningScript) return;
      setQueryChanged(true);
      setQuery(value);
    },
    [runningScript]
  );

  useEffect(() => {
    if (!selectedCollection) return;
    if (queryChanged) return;
    setQuery(`SELECT * FROM $[${selectedCollection}]`);
  }, [selectedCollection, queryChanged]);

  const selectedCollectionSchema = useMemo(() => {
    if (loadingSchema) return;
    if (!schema) return;
    if (!selectedCollection) return;
    return schema.find((schema) => {
      return schema.formatted_name === selectedCollection;
    });
  }, [schema, selectedCollection, loadingSchema]);

  return (
    <>
      <div className='container relative mx-auto mb-4 flex max-w-6xl flex-col gap-4 px-2 md:px-4'>
        <div className='flex w-full flex-wrap items-center justify-end gap-2 md:gap-4'>
          <Button
            colorScheme='light'
            variant='solid'
            size='sm'
            icon={<TbDownload />}
            href={`${repository?.slug}/download`}
          >
            {dict.repository.download.download}
          </Button>
          {repository && !repository.is_immutable && (
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
