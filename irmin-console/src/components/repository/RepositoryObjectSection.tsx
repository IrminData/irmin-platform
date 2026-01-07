'use client';

import { useCallback, useMemo, useState } from 'react';

import { notFound } from 'next/navigation';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import { TbBookmark, TbChevronUp } from 'react-icons/tb';

import CreateSavedQueryModal from '@/components/query/CreateQueryModal';
import SqlHelper from '@/components/query/helper/SqlHelper';
import QueryResults from '@/components/query/QueryResults';
import ObjectViewer from '@/components/repository/objects/ObjectViewer';
import RepositoryFiletree from '@/components/repository/objects/RepositoryFiletree';
import SimpleObjectDetails from '@/components/repository/objects/SimpleObjectDetails';
import CodeMirrorEditor from '@/components/scripts/ide/CodeMirrorEditor';
import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useQuery } from '@/context/QueryContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  useRepositoryObject,
  useRepositoryObjectContent,
  useRepositoryObjectSchema,
  useStoredQueries,
} from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { Tag } from '@/types/core/Tag';

/**
 * Repository object section component for viewing a single repository object.
 * GitHub-like layout with filetree at top, content in middle, and details sidebar.
 *
 * @param props - The component props
 * @param props.repositorySlug - The slug of the repository
 * @param props.repositoryRef - The ref to view (optional, defaults to currentRef from context)
 * @param props.path - The path of the object to view (optional)
 */
export default function RepositoryObjectSection({
  repositorySlug,
  repositoryRef: refProp,
  path,
}: {
  repositorySlug: string;
  repositoryRef?: string;
  path?: string;
}) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const { currentRef, repository } = useRepositoryContext();
  const { isResourceAllowed } = useResourceAllowed();

  const effectiveRef = refProp ?? currentRef ?? repository.default_branch;

  const { executeSql, loading: queryLoading, result: queryResult } = useQuery();
  const [queryResultsOpen, setQueryResultsOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState<string | null>(null);

  const { createStoredQueryMutation } = useStoredQueries();

  const { repositoryObjectQuery } = useRepositoryObject(
    repositorySlug,
    effectiveRef,
    path
  );

  const { repositoryObjectContentQuery } = useRepositoryObjectContent(
    repositorySlug,
    effectiveRef,
    path,
    true
  );

  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    repositorySlug,
    effectiveRef,
    path,
    { enabled: !!path }
  );

  const selectedObject = repositoryObjectQuery.data?.data;

  const defaultQuery = useMemo(() => {
    if (!selectedObject || selectedObject.type !== 'structured') return '';
    return `SELECT * FROM $["${repositorySlug};${selectedObject.path}${effectiveRef ? `@${effectiveRef}` : ''}"] LIMIT 10`;
  }, [repositorySlug, selectedObject, effectiveRef]);

  const queryField = customQuery ?? defaultQuery;

  const canQuery = useMemo(
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  const handleSaveQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    irminModal.show(
      dict.query.newQuery,
      <CreateSavedQueryModal
        workspaceSlug={workspaceSlug}
        createQuery={async (
          queryName: string,
          queryDescription: string,
          tags?: Tag[]
        ) => {
          const res = await createStoredQueryMutation.mutateAsync({
            name: queryName,
            description: queryDescription,
            sql: queryField,
            tags: tags?.map((tag) => tag.id),
          });
          if (!res.data) return;
          irminModal.close();
        }}
      />,
      () => irminModal.close()
    );
  }, [dict, irminModal, queryField, createStoredQueryMutation, workspaceSlug]);

  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    executeSql(queryField);
    setQueryResultsOpen(true);
  }, [queryField, executeSql]);

  const updateQuery = useCallback(
    (value: string) => {
      if (queryLoading) return;
      setCustomQuery(value);
    },
    [queryLoading]
  );

  if (repositoryObjectQuery.isError) {
    console.error(repositoryObjectQuery.error);
    return notFound();
  }

  if (repositoryObjectQuery.isLoading || !selectedObject) {
    return (
      <div
        className={`
          mx-auto flex max-w-7xl flex-col gap-2 p-2
          md:px-4
        `}
      >
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <>
      <div
        className={`
          mx-auto flex max-w-7xl flex-col gap-4 px-2 py-4
          md:px-4
        `}
      >
        {/* SQL Query Editor */}
        {canQuery && (
          <div
            className={`
              w-full max-w-full overflow-hidden rounded-md border
              border-gray-100 bg-background
              dark:border-gray-800
            `}
          >
            <div
              className={`
                flex w-full flex-row items-center justify-between bg-gray-100
                pl-4
                dark:bg-gray-800
              `}
            >
              <div
                className={`
                  flex flex-row items-center gap-2 py-2 text-sm font-semibold
                `}
              >
                {dict.repository.sqlQuery}
                <SqlHelper
                  currentSql={queryField}
                  repositoryObject={selectedObject}
                  selector={selectedObject?.sql_selector}
                  title={selectedObject?.name}
                />
              </div>
              <div className='flex flex-row items-center'>
                <Button
                  variant='gray'
                  className='float-end m-1 shadow-none'
                  size='sm'
                  icon={<TbBookmark />}
                  disabled={!queryField || queryField.length < 3}
                  onClick={handleSaveQuery}
                >
                  {dict.query.saveQuery}
                </Button>
                <Button
                  variant='accent'
                  className='float-end m-1 shadow-none'
                  size='sm'
                  icon={<AiOutlinePlayCircle />}
                  loading={queryLoading}
                  onClick={runCurrentQuery}
                >
                  {dict.repository.runQuery}
                </Button>
              </div>
            </div>
            <CodeMirrorEditor
              language='sql'
              content={queryField}
              updateEditorContent={updateQuery}
            />
          </div>
        )}

        {!queryResultsOpen ? (
          <>
            {/* Filetree at the top */}
            <RepositoryFiletree
              currentPath={path}
              repositorySlug={repositorySlug}
              repositoryRef={effectiveRef}
            />

            {/* Main content area with object viewer and details sidebar */}
            <div
              className={`
                flex flex-col gap-4
                lg:flex-row
              `}
            >
              {/* Content viewer - takes up most of the space */}
              <div className='flex-1'>
                {repositoryObjectContentQuery.isLoading ? (
                  <div
                    className={`rounded-lg border border-card bg-background p-8`}
                  >
                    <LoadingSkeleton className='h-96 w-full' />
                  </div>
                ) : repositoryObjectContentQuery.error ? (
                  <div
                    className={`rounded-lg border border-card bg-background p-8`}
                  >
                    <QueryError
                      error={repositoryObjectContentQuery.error}
                      onRetry={() => repositoryObjectContentQuery.refetch()}
                      title='Error loading object content'
                      size='sm'
                    />
                  </div>
                ) : (
                  <div className='rounded-lg border border-card bg-background'>
                    {selectedObject && (
                      <ObjectViewer
                        object={selectedObject}
                        objectContent={
                          repositoryObjectContentQuery.data ?? null
                        }
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Object details sidebar */}
              <div className='lg:w-80 lg:shrink-0'>
                <SimpleObjectDetails
                  selectedObject={selectedObject}
                  selectedObjectSchema={
                    repositoryObjectSchemaQuery.data?.data ?? undefined
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div className='mt-4'>
            <Button
              variant='gray'
              size='sm'
              className='w-full text-pretty capitalize'
              onClick={() => setQueryResultsOpen(false)}
              icon={<TbChevronUp size={22} />}
            >
              {dict.common.close} {dict.query.queryResults}
            </Button>
          </div>
        )}
      </div>
      {queryResult && queryResultsOpen && (
        <div className='flex h-[calc(100vh-400px)] min-h-96'>
          <QueryResults
            title={dict.query.queryResults}
            result={queryResult}
            loading={queryLoading}
          />
        </div>
      )}
    </>
  );
}
