'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MdPlayArrow } from 'react-icons/md';
import {
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbFile,
  TbPencil,
  TbShield,
  TbTrash,
  TbX,
} from 'react-icons/tb';

import CodeMirrorEditor from '@/components/editor/ide/CodeMirrorEditor';
import QueryResults from '@/components/query/QueryResults';
import SchemaViewer from '@/components/repository/objects/SchemaViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import QueryError from '@/components/ui/error/QueryError';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useQuery } from '@/context/QueryContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useStoredQueries } from '@/hooks/useStoredQueries';
import { useWorkspaceSchema } from '@/hooks/useWorkspaceSchema';
import { useWorkspaceTags } from '@/hooks/useWorkspaceTags';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import { StoredQuery } from '@/types/core/StoredQuery';
import { Tag, TagEntityType } from '@/types/core/Tag';

import CreateSavedQueryModal from './CreateQueryModal';
import UpdateQueryModal from './UpdateQueryModal';

/**
 * Queries section
 *
 * Provides a section to edit queries and view query results
 */
export default function QueriesSection() {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const workspaceSchema = useWorkspaceSchema();
  const { isResourceAllowed } = useResourceAllowed();
  const {
    storedQueriesQuery,
    createStoredQueryMutation,
    updateStoredQueryMutation,
    deleteStoredQueryMutation,
  } = useStoredQueries();

  const {
    executeSql,
    cleanup,
    loading: queryLoading,
    result: queryResult,
  } = useQuery();

  const [selectedQuery, setSelectedQuery] = useState<StoredQuery | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [edited, setEdited] = useState<boolean>(false);

  const [queryResultsOpen, setQueryResultsOpen] = useState(false);

  const queryContentId = useRef<string>(null);
  useEffect(() => {
    if (!selectedQuery) return;
    if (queryContentId.current === selectedQuery.id) return;
    queryContentId.current = selectedQuery.id;
    setEditorContent(selectedQuery.sql);
    setEdited(false);
    cleanup();
  }, [selectedQuery, cleanup]);

  // Tag editing functionality
  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags();

  const canViewTags = useMemo(
    () =>
      isResourceAllowed(PolicyResource.WorkspaceTag, PolicyAction.Read) &&
      isResourceAllowed(
        PolicyResource.Query,
        PolicyAction.Read,
        selectedQuery?.id
      ),
    [isResourceAllowed, selectedQuery?.id]
  );

  const canChangeTags = useMemo(
    () =>
      isResourceAllowed(PolicyResource.WorkspaceTag, PolicyAction.Create) &&
      isResourceAllowed(
        PolicyResource.Query,
        PolicyAction.Update,
        selectedQuery?.id
      ),
    [isResourceAllowed, selectedQuery?.id]
  );

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');

  // Update selected tags when query changes
  useEffect(() => {
    if (selectedQuery) {
      setSelectedTags(selectedQuery.tags ?? []);
    } else {
      setSelectedTags([]);
    }
  }, [selectedQuery]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      try {
        if (!selectedQuery) return tags;
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

        // Use selectedQuery.tags directly instead of selectedTags to avoid race condition
        const currentTags = selectedQuery.tags ?? [];
        setSelectedTags(tags);
        setUpdatingTags(true);

        const tagsToAdd = [];
        const tagsToRemove = [];
        for (const tag of tags) {
          if (!currentTags.some((t) => t.id === tag.id)) {
            tagsToAdd.push(tag);
          }
        }
        for (const tag of currentTags) {
          if (!tags.some((t) => t.id === tag.id)) {
            tagsToRemove.push(tag);
          }
        }
        await Promise.all([
          ...tagsToAdd.map((tag) =>
            addTagToEntityMutation.mutateAsync({
              id: tag.id,
              entityType: TagEntityType.Query,
              entityId: selectedQuery.id,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: TagEntityType.Query,
              entityId: selectedQuery.id,
            })
          ),
        ]);

        // Only update previousTags after successful API calls
        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        return [];
      } finally {
        setUpdatingTags(false);
      }
    },
    [addTagToEntityMutation, removeTagFromEntityMutation, selectedQuery]
  );

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  /**
   * Hook to create a new query by showing a modal to input the query name and description
   * and then creating the query.
   */
  const handleCreateQuery = useMemo(
    () => async () => {
      irminModal.show(
        dict.query.newQuery,
        <CreateSavedQueryModal
          createQuery={async (queryName: string, queryDescription: string) => {
            const res = await createStoredQueryMutation.mutateAsync({
              name: queryName,
              description: queryDescription,
              sql: editorContent,
            });
            if (!res.data) return;
            irminModal.close();
            setSelectedQuery(res.data);
            setEdited(false);
          }}
        />,
        () => irminModal.close()
      );
    },
    [irminModal, dict, editorContent, createStoredQueryMutation]
  );

  /**
   * Hook to save the currently selected query with the updated content
   */
  const handleSaveQuery = useMemo(
    () => async () => {
      if (!selectedQuery) return;
      const res = await updateStoredQueryMutation.mutateAsync({
        id: selectedQuery.id,
        name: selectedQuery.name,
        description: selectedQuery.description,
        sql: editorContent,
      });
      if (!res.data) return;
      setEdited(false);
    },
    [selectedQuery, editorContent, updateStoredQueryMutation]
  );

  /**
   * Hook to run the current editor content as a query
   * and display the results in the results section
   */
  const handleRunQuery = useMemo(
    () => async () => {
      setQueryResultsOpen(true);
      await executeSql(editorContent);
    },
    [executeSql, editorContent]
  );

  /**
   * Hook to edit the currently selected query by showing a modal to input the new query name and description
   * and then updating the query.
   */
  const handleEditQuery = useMemo(
    () => async () => {
      if (!selectedQuery) return;
      irminModal.show(
        dict.query.newQuery,
        <UpdateQueryModal
          currentName={selectedQuery.name}
          currentDescription={selectedQuery.description}
          updateQuery={async (queryName: string, queryDescription: string) => {
            const res = await updateStoredQueryMutation.mutateAsync({
              id: selectedQuery.id,
              name: queryName,
              description: queryDescription,
              sql: editorContent,
            });
            if (!res.data) return;
            setEdited(false);
            irminModal.close();
          }}
        />,
        () => irminModal.close()
      );
    },
    [irminModal, dict, selectedQuery, editorContent, updateStoredQueryMutation]
  );

  /**
   * Hook to delete the currently selected query
   */
  const handleDeleteQuery = useMemo(
    () => async () => {
      if (!selectedQuery) return;
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToDelete}: ${selectedQuery.name}`
      );
      if (!confirmed) return;
      const res = await deleteStoredQueryMutation.mutateAsync(selectedQuery.id);
      if (!res.data) return;
      setSelectedQuery(null);
      setEdited(false);
    },
    [selectedQuery, deleteStoredQueryMutation, dict, irminConfirm]
  );

  /**
   * Hook to update the editor content and set the edited flag
   *
   * @param content - The new content of the editor
   */
  const updateEditorContent = useMemo(
    () => (content: string) => {
      setEditorContent(content);
      setEdited(true);
    },
    []
  );

  return (
    <div className='bg-background flex h-full w-full flex-col'>
      <div className='flex h-full flex-col lg:flex-row lg:overflow-y-scroll'>
        <div className='border-border order-3 flex min-h-80 w-full flex-col overflow-y-scroll border-t lg:order-1 lg:w-80 lg:border-0 lg:border-r'>
          <div className='p-2'>
            <Button
              className='w-full'
              variant={'default'}
              onClick={handleCreateQuery}
            >
              {dict.query.newQuery}
            </Button>
          </div>
          {storedQueriesQuery.isLoading && (
            <ListSkeleton items={6} className='p-2' />
          )}
          {storedQueriesQuery.error && (
            <QueryError
              error={storedQueriesQuery.error}
              onRetry={() => storedQueriesQuery.refetch()}
              title={dict.common.somethingWentWrong}
              size='sm'
              className='m-4'
            />
          )}
          {!storedQueriesQuery.isLoading && !storedQueriesQuery.error && storedQueriesQuery.data?.data?.length === 0 && (
            <div className='p-4'>
              <div className='text-center py-8'>
                <h3 className='text-lg font-medium text-gray-700 dark:text-gray-300 mb-2'>{dict.list.emptyState.queries.title}</h3>
                <p className='text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto'>
                  {dict.list.emptyState.queries.description}
                </p>
              </div>
            </div>
          )}
          {storedQueriesQuery.data?.data?.map((query, idx) => (
            <div
              className={`border-border hover:bg-card flex cursor-pointer flex-row items-center justify-between gap-2 border-b p-4 transition-all ${selectedQuery?.id === query.id ? 'bg-card' : ''} `}
              key={`query-${idx}`}
              onClick={() => setSelectedQuery(query)}
            >
              <div className='flex flex-col gap-1'>
                <p className='text-sm'>{query.name}</p>
                <p className='text-foreground/50 text-xs'>
                  {query.description}
                </p>
                {/* Display tags if they exist */}
                {query.tags && query.tags.length > 0 && (
                  <div className='mt-1'>
                    <WorkspaceTagDisplay
                      tags={query.tags}
                      maxVisible={3}
                      size='sm'
                    />
                  </div>
                )}
              </div>
              <div>
                <TbChevronRight size={22} />
              </div>
            </div>
          ))}
        </div>
        <div className='order-1 h-full lg:order-2 lg:grow lg:overflow-y-scroll'>
          <CodeMirrorEditor
            language='sql'
            content={editorContent}
            updateEditorContent={updateEditorContent}
          />
        </div>
        {selectedQuery && (
          <div className='border-border relative order-2 flex w-full flex-col gap-2 border-t p-2 lg:order-3 lg:w-80 lg:overflow-y-scroll lg:border-0 lg:border-l'>
            <Button
              size={'icon'}
              variant={'ghost'}
              onClick={() => setSelectedQuery(null)}
              icon={<TbX size={22} />}
              className='absolute top-2 right-2'
            ></Button>
            <Badge className='mt-2'>{dict.query.selectedQuery}</Badge>
            <p className='text-sm'>{selectedQuery.name}</p>
            <p className='text-foreground/50 mb-2 pb-2 text-xs'>
              {selectedQuery.description}
            </p>

            {/* Tags section */}
            {canViewTags && (
              <div className='mb-4 border-b border-gray-200 pb-4 dark:border-gray-800'>
                <WorkspaceTagSelector
                  selectedTags={selectedTags}
                  onTagsChange={handleUpdateTags}
                  loading={updatingTags}
                  disabled={!canChangeTags}
                />
              </div>
            )}

            <Button
              variant='default'
              size='sm'
              className='w-full'
              icon={<TbFile />}
              onClick={handleSaveQuery}
              disabled={!edited}
            >
              {dict.common.save}
            </Button>
            <Button
              variant='accent'
              size='sm'
              className='w-full'
              icon={<MdPlayArrow />}
              onClick={handleRunQuery}
              disabled={queryLoading}
            >
              {dict.query.run}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              className='w-full'
              icon={<TbShield />}
              href={`${workspaceUrl}/queries/policies?queryID=${selectedQuery.id}`}
            >
              {dict.workspace.policies}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              className='w-full'
              icon={<TbPencil />}
              onClick={handleEditQuery}
            >
              {dict.list.edit}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              className='w-full'
              icon={<TbTrash />}
              onClick={handleDeleteQuery}
            >
              {dict.list.delete}
            </Button>
          </div>
        )}
      </div>
      {!queryResultsOpen ? (
        <div className='contents'>
          <div className='h-full max-h-[calc(100vh-400px)] overflow-y-scroll border-t border-gray-200 p-4 dark:border-gray-800'>
            {workspaceSchema.loading ? (
              <LoadingSkeleton className='h-full w-full' />
            ) : workspaceSchema.schema ? (
              <SchemaViewer schema={workspaceSchema.schema} isExpanded={true} />
            ) : (
              <></>
            )}
          </div>

          <Button
            variant='gray'
            size='sm'
            className='w-full py-4 text-pretty capitalize'
            onClick={() => setQueryResultsOpen(true)}
            icon={<TbChevronDown size={22} />}
          >
            {dict.common.open} {dict.query.queryResults}
          </Button>
        </div>
      ) : (
        <div className='contents'>
          <Button
            variant='gray'
            size='sm'
            className='w-full py-4 text-pretty capitalize'
            onClick={() => setQueryResultsOpen(false)}
            icon={<TbChevronUp size={22} />}
          >
            {dict.common.close} {dict.query.queryResults}
          </Button>
          <div className='flex h-[calc(100vh-400px)] min-h-96'>
            <QueryResults
              title={`${dict.query.results} ${selectedQuery ? `(${selectedQuery.name})` : ''}`}
              result={queryResult}
              onRun={handleRunQuery}
              loading={queryLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
