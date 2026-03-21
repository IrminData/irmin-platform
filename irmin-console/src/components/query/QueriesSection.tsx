'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSearchParams } from 'next/navigation';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import {
  TbChevronRight,
  TbFile,
  TbPencil,
  TbSearch,
  TbShield,
  TbTemplate,
  TbTrash,
  TbX,
} from 'react-icons/tb';

import QueryResults from '@/components/query/QueryResults';
import ResizableCodeEditor from '@/components/scripts/ide/ResizableCodeEditor';
import { TemplateLibraryModal } from '@/components/scripts/TemplateLibraryModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useStoredQuery } from '@/context/QueryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  useStoredQueries,
  useWorkspaceSchema,
  useWorkspaceTags,
} from '@/hooks/api';
import { useQueryTemplates } from '@/hooks/api/useQueryTemplates';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { StoredQuery } from '@/types/core/StoredQuery';
import type { Tag } from '@/types/core/Tag';
import type { ActionInputData } from '@/types/core/Workflow';

import CreateSavedQueryModal from './CreateQueryModal';
import SqlHelper from './helper/SqlHelper';
import UpdateQueryModal from './UpdateQueryModal';

/**
 * Queries section
 *
 * Provides a section to edit queries and view query results
 */
export default function QueriesSection() {
  return (
    <Suspense>
      <QueriesSectionContent />
    </Suspense>
  );
}

function QueriesSectionContent() {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const workspaceSchema = useWorkspaceSchema();
  const { isResourceAllowed } = useResourceAllowed();
  const searchParams = useSearchParams();
  const {
    storedQueriesQuery,
    createStoredQueryMutation,
    updateStoredQueryMutation,
    deleteStoredQueryMutation,
  } = useStoredQueries();

  const { queryTemplatesQuery } = useQueryTemplates();
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const {
    executeSql,
    cleanup,
    loading: queryLoading,
    result: queryResult,
  } = useStoredQuery();

  const [selectedQuery, setSelectedQuery] = useState<StoredQuery | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [edited, setEdited] = useState<boolean>(false);
  const [isDraftQuery, setIsDraftQuery] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [queryInputFiles, setQueryInputFiles] = useState<ActionInputData[]>([]);
  const [editorHeight, setEditorHeight] = useState('300px');

  // Filter queries based on search
  const filteredQueries = useMemo(
    () =>
      storedQueriesQuery.data?.data?.filter((query) =>
        query.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) ?? [],
    [storedQueriesQuery.data?.data, searchQuery]
  );

  const queryContentId = useRef<string>(null);
  useEffect(() => {
    if (!selectedQuery) return;
    if (queryContentId.current === selectedQuery.id) return;
    queryContentId.current = selectedQuery.id;
    setEditorContent(selectedQuery.sql);
    setEdited(false);
    cleanup();
  }, [selectedQuery, cleanup]);

  // Handle query parameter from URL
  const handledQueryIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (storedQueriesQuery.isLoading) return;
    const queryId = searchParams.get('query');

    // Reset ref if query parameter was removed
    if (!queryId) {
      handledQueryIdRef.current = null;
      return;
    }

    // Skip if we've already handled this query ID
    if (handledQueryIdRef.current === queryId) {
      return;
    }

    const queries = storedQueriesQuery.data?.data ?? [];
    const query = queries.find((q) => q.id === queryId);
    if (query) {
      handledQueryIdRef.current = queryId;
      setSelectedQuery(query);
    }
  }, [
    searchParams,
    storedQueriesQuery.isLoading,
    storedQueriesQuery.data?.data,
  ]);

  // Tag editing functionality
  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags(workspaceSlug);

  const canViewTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'read') &&
      isResourceAllowed('query', 'read', selectedQuery?.id),
    [isResourceAllowed, selectedQuery?.id]
  );

  const canChangeTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'create') &&
      isResourceAllowed('query', 'update', selectedQuery?.id),
    [isResourceAllowed, selectedQuery?.id]
  );

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');
  const currentTagsRef = useRef<Tag[]>([]);

  // Update selected tags when query changes
  useEffect(() => {
    const tags = selectedQuery?.tags ?? [];
    setSelectedTags(tags);
    currentTagsRef.current = tags;
    previousTags.current = ''; // Reset to ensure proper comparison in handleUpdateTags
  }, [selectedQuery]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      if (!selectedQuery) return tags;
      try {
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

        // Use ref to get the most current tags state, handling rapid changes correctly
        // This ensures each operation builds on the previous optimistic update
        const currentTags = currentTagsRef.current;
        setSelectedTags(tags);
        currentTagsRef.current = tags;
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
              entityType: 'queries',
              entityId: selectedQuery.id,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'queries',
              entityId: selectedQuery.id,
            })
          ),
        ]);

        // Only update previousTags after successful API calls
        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        // Revert to the last known good state on error
        const fallbackTags = selectedQuery.tags ?? [];
        setSelectedTags(fallbackTags);
        currentTagsRef.current = fallbackTags;
        previousTags.current = JSON.stringify(fallbackTags);
        return fallbackTags;
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
   * Enter draft mode for a new query — opens a clean editor without showing a modal.
   * The user can start writing SQL immediately and save later via "Save As".
   */
  const handleCreateQuery = useCallback(
    async (initialContent?: string) => {
      // If there are unsaved edits, confirm before discarding
      if (
        (edited || (isDraftQuery && editorContent.trim())) &&
        !initialContent
      ) {
        const confirmed = await irminConfirm(
          'warning',
          dict.scripts.unsavedChangesDiscard
        );
        if (!confirmed) return;
      }
      setSelectedQuery(null);
      queryContentId.current = null;
      setEditorContent(
        typeof initialContent === 'string' ? initialContent : ''
      );
      setEdited(false);
      setIsDraftQuery(true);
      cleanup();
    },
    [edited, isDraftQuery, editorContent, irminConfirm, dict, cleanup]
  );

  /**
   * Save the current draft query by opening the create modal with current editor content.
   */
  const handleSaveAsQuery = useCallback(() => {
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
            sql: editorContent,
            tags: tags?.map((tag) => tag.id),
          });
          if (!res.data) return;
          irminModal.close();
          setSelectedQuery(res.data);
          setIsDraftQuery(false);
          setEdited(false);
        }}
      />,
      () => irminModal.close()
    );
  }, [
    irminModal,
    dict,
    editorContent,
    createStoredQueryMutation,
    workspaceSlug,
  ]);

  const handleTemplateSelect = useCallback(
    (content: string, createNew: boolean) => {
      if (createNew) {
        setSelectedQuery(null);
        queryContentId.current = null;
        setEditorContent(content);
        setEdited(false);
        setIsDraftQuery(true);
        cleanup();
      } else {
        setEditorContent(content);
        setEdited(true);
      }
    },
    [cleanup]
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
      await executeSql(editorContent, true, queryInputFiles);
    },
    [executeSql, editorContent, queryInputFiles]
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
   * Select a query from the sidebar, confirming if there are unsaved draft changes.
   */
  const handleSelectQuery = useCallback(
    async (query: StoredQuery) => {
      if (isDraftQuery && editorContent.trim()) {
        const confirmed = await irminConfirm(
          'warning',
          dict.scripts.unsavedChangesDiscard
        );
        if (!confirmed) return;
      }
      setIsDraftQuery(false);
      setSelectedQuery(query);
    },
    [isDraftQuery, editorContent, irminConfirm, dict]
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
    <SafeComponent
      level='section'
      title='Query Interface Error'
      description='Failed to load query interface'
    >
      <div className='flex size-full flex-col bg-background'>
        <div
          className={`
            flex flex-1 flex-col overflow-hidden
            lg:flex-row
          `}
        >
          <div
            className={`
              order-3 flex min-h-80 w-full flex-col overflow-y-scroll border-t
              border-border
              lg:order-1 lg:w-80 lg:shrink-0 lg:border-0 lg:border-r
            `}
          >
            <div className='flex flex-col gap-2 p-2'>
              <Button
                className='w-full'
                variant={'default'}
                onClick={() => handleCreateQuery()}
              >
                {dict.query.newQuery}
              </Button>
              <Button
                className='w-full'
                variant='outline'
                onClick={() => setTemplateModalOpen(true)}
                icon={<TbTemplate />}
              >
                {dict.common.createFromTemplate}
              </Button>
            </div>
            <div className='border-b p-2'>
              <div className='relative'>
                <TbSearch
                  className={`
                    absolute top-1/2 left-2 -translate-y-1/2
                    text-muted-foreground
                  `}
                  size={16}
                />
                <input
                  type='text'
                  placeholder={dict.query.searchQueries}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`
                    w-full rounded-md border border-border bg-background py-1.5
                    pr-2 pl-8 text-sm transition-colors
                    focus:border-primary focus:ring-1 focus:ring-primary
                    focus:outline-none
                  `}
                />
              </div>
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
            {!storedQueriesQuery.isLoading &&
              !storedQueriesQuery.error &&
              filteredQueries.length === 0 && (
                <div className='p-4'>
                  <div className='py-8 text-center'>
                    <h3
                      className={`
                        mb-2 text-lg font-medium text-gray-700
                        dark:text-gray-300
                      `}
                    >
                      {dict.list.emptyState.queries.title}
                    </h3>
                    <p
                      className={`
                        mx-auto mb-4 max-w-sm text-gray-500
                        dark:text-gray-400
                      `}
                    >
                      {dict.list.emptyState.queries.description}
                    </p>
                  </div>
                </div>
              )}
            {filteredQueries.map((query) => (
              <div
                key={`query-${query.id}`}
                className={`
                  flex cursor-pointer flex-row items-center justify-between
                  gap-2 border-b border-border p-4 transition-all
                  hover:bg-card
                  ${selectedQuery?.id === query.id ? `bg-card` : ''}
                `}
                onClick={() => handleSelectQuery(query)}
                role='button'
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectQuery(query);
                  }
                }}
              >
                <div className='flex flex-col gap-1'>
                  <p className='text-sm'>{query.name}</p>
                  <p className='text-xs text-foreground/50'>
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
          <div
            className={`
              relative order-1 flex flex-1 flex-col overflow-hidden
              lg:order-2 lg:min-w-0 lg:grow
            `}
          >
            <div
              className={`
                flex items-center justify-between border-b bg-muted/30 px-4 py-2
              `}
            >
              <h3 className='text-sm font-medium'>
                {dict.query.editor}{' '}
                {selectedQuery
                  ? `(${selectedQuery.name})`
                  : isDraftQuery
                    ? `(${dict.query.newQuery})`
                    : ''}
              </h3>
              <div className='flex items-center gap-2'>
                <SqlHelper
                  schema={workspaceSchema.schema || undefined}
                  currentSql={editorContent}
                />
                {isDraftQuery && !selectedQuery && (
                  <Button
                    variant='default'
                    size='sm'
                    icon={<TbFile />}
                    onClick={handleSaveAsQuery}
                    disabled={!editorContent.trim()}
                  >
                    {dict.query.saveAs}
                  </Button>
                )}
                {selectedQuery && (
                  <Button
                    variant='default'
                    size='sm'
                    icon={<TbFile />}
                    onClick={handleSaveQuery}
                    disabled={!edited}
                  >
                    {dict.common.save}
                  </Button>
                )}
                <Button
                  variant='accent'
                  size='sm'
                  icon={<AiOutlinePlayCircle />}
                  onClick={handleRunQuery}
                  loading={queryLoading}
                >
                  {dict.repository.runQuery}
                </Button>
              </div>
            </div>
            <ResizableCodeEditor
              language='sql'
              content={editorContent}
              updateTabContent={updateEditorContent}
              editorHeight={editorHeight}
              setEditorHeight={setEditorHeight}
            />
            <div className='flex min-h-0 flex-1 flex-col'>
              <QueryResults
                title={`${dict.query.results} ${selectedQuery ? `(${selectedQuery.name})` : ''}`}
                result={queryResult}
                loading={queryLoading}
                onRun={handleRunQuery}
                inputFiles={queryInputFiles}
                setInputFiles={setQueryInputFiles}
              />
            </div>
          </div>
          {selectedQuery && (
            <div
              className={`
                relative order-2 flex w-full flex-col gap-2 border-t
                border-border p-2
                lg:order-3 lg:w-80 lg:min-w-80 lg:shrink-0 lg:overflow-y-scroll
                lg:border-0 lg:border-l
              `}
            >
              <Button
                size={'icon'}
                variant={'ghost'}
                onClick={() => setSelectedQuery(null)}
                icon={<TbX size={22} />}
                className='absolute top-2 right-2'
              />
              <Badge className='mt-2'>{dict.query.selectedQuery}</Badge>
              <p className='text-sm'>{selectedQuery.name}</p>
              <p className='mb-2 pb-2 text-xs text-foreground/50'>
                {selectedQuery.description}
              </p>

              {/* Tags section */}
              {canViewTags && (
                <div
                  className={`
                    mb-4 border-b border-gray-200 pb-4
                    dark:border-gray-800
                  `}
                >
                  <WorkspaceTagSelector
                    selectedTags={selectedTags}
                    onTagsChange={handleUpdateTags}
                    loading={updatingTags}
                    disabled={!canChangeTags}
                    workspaceSlug={workspaceSlug}
                  />
                </div>
              )}

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
                {dict.common.edit}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                className='w-full'
                icon={<TbTrash />}
                onClick={handleDeleteQuery}
              >
                {dict.common.delete}
              </Button>
            </div>
          )}
        </div>
      </div>
      <TemplateLibraryModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        templates={queryTemplatesQuery.data?.data || []}
        loading={queryTemplatesQuery.isLoading}
        onSelectTemplate={handleTemplateSelect}
      />
    </SafeComponent>
  );
}
