'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { IoSave } from 'react-icons/io5';
import { TbExternalLink } from 'react-icons/tb';

import IrminCore from '@/lib/core';
import { storedQueriesQueryKey } from '@/lib/queryKeys';

import CreateSavedQueryModal from '@/components/query/CreateQueryModal';
import SqlHelper from '@/components/query/helper/SqlHelper';
import CodeMirrorEditor from '@/components/scripts/ide/CodeMirrorEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useStoredQueries } from '@/hooks/api/useStoredQueries';
import { useBaseUrl } from '@/hooks/utils';

interface InlineQueryEditorProps {
  currentQueryId: string | null;
  onQueryIdChange: (queryId: string) => void;
  disabled?: boolean;
}

/**
 * Inline query editor component for workflows and pipeline stages
 * Allows selecting existing queries or creating new ones, with built-in SQL editor
 */
export default function InlineQueryEditor({
  currentQueryId,
  onQueryIdChange,
  disabled = false,
}: InlineQueryEditorProps) {
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminModal, irminAlert, irminConfirm } = usePopup();
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const {
    storedQueriesQuery,
    createStoredQueryMutation,
    updateStoredQueryMutation,
  } = useStoredQueries();

  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isNewQuery, setIsNewQuery] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const isTransitioningFromNewQueryRef = useRef(false);
  const previousNormalizedQueryIdRef = useRef<string | null>(null);
  const isUserInitiatedChangeRef = useRef(false);

  const queries = storedQueriesQuery.data?.data ?? [];
  // Normalize currentQueryId: empty string becomes null
  const normalizedQueryId = useMemo(
    () => (currentQueryId && currentQueryId.trim() ? currentQueryId : null),
    [currentQueryId]
  );
  // Store normalizedQueryId in a ref to avoid dependency issues
  const normalizedQueryIdRef = useRef(normalizedQueryId);

  // Fetch single query
  const queryQuery = useQuery({
    queryKey: [
      ...storedQueriesQueryKey(workspaceSlug),
      normalizedQueryId ?? '',
    ],
    queryFn: async () => {
      if (!normalizedQueryId) return null;
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.queryService.getStoredQuery({
        workspace: workspaceSlug,
        queryID: normalizedQueryId,
      });
      return response.data;
    },
    enabled: !!normalizedQueryId,
  });

  const currentQuery = queryQuery.data;
  const queryExists = normalizedQueryId
    ? queries.some((q) => q.id === normalizedQueryId)
    : false;

  // Store onQueryIdChange in a ref to avoid including it in dependency arrays
  const onQueryIdChangeRef = useRef(onQueryIdChange);
  useEffect(() => {
    onQueryIdChangeRef.current = onQueryIdChange;
  }, [onQueryIdChange]);

  // Handle query deletion - if query was deleted externally, reset to blank
  useEffect(() => {
    if (normalizedQueryId && !queryQuery.isLoading && queryQuery.isError) {
      // Query fetch failed (likely deleted)
      irminAlert('error', dict.query.queryNotFound);
      onQueryIdChangeRef.current('');
    } else if (
      normalizedQueryId &&
      !queryQuery.isLoading &&
      queries.length > 0 &&
      !queryExists
    ) {
      // Query was deleted from list
      irminAlert('error', dict.query.queryDeleted);
      onQueryIdChangeRef.current('');
    }
  }, [
    normalizedQueryId,
    queryQuery.isLoading,
    queryQuery.isError,
    queryExists,
    queries.length,
    irminAlert,
    dict.query,
  ]);

  // Reset state immediately when queryId changes (before data loads)
  // Only update if the value actually changed (not just a re-render)
  useEffect(() => {
    // Skip if this is a user-initiated change (handled by handleQuerySelect)
    if (isUserInitiatedChangeRef.current) {
      // Still update the refs even if skipping reset logic
      normalizedQueryIdRef.current = normalizedQueryId;
      previousNormalizedQueryIdRef.current = normalizedQueryId;
      return;
    }

    // Capture the previous value BEFORE updating refs
    const previousValue = previousNormalizedQueryIdRef.current;

    // Skip if the value hasn't actually changed
    if (previousValue === normalizedQueryId) {
      // Update refs to current value
      normalizedQueryIdRef.current = normalizedQueryId;
      previousNormalizedQueryIdRef.current = normalizedQueryId;
      return;
    }

    if (!normalizedQueryId) {
      // No query selected - show blank editor
      setEditorContent('');
      setOriginalContent('');
      setIsNewQuery(true);
      setHasUnsavedChanges(false);
      isTransitioningFromNewQueryRef.current = false;
    } else {
      // Query ID exists
      // If we're transitioning from a newly created query, preserve the editor content
      // Otherwise, clear editor to prevent stale content from a different query
      if (!isTransitioningFromNewQueryRef.current) {
        setEditorContent('');
        setOriginalContent('');
      }
      setIsNewQuery(false);
      setHasUnsavedChanges(false);
    }

    // Update refs AFTER reset logic completes
    normalizedQueryIdRef.current = normalizedQueryId;
    previousNormalizedQueryIdRef.current = normalizedQueryId;
  }, [normalizedQueryId]);

  // Load query content when it becomes available
  useEffect(() => {
    if (normalizedQueryId && currentQuery && !queryQuery.isLoading) {
      setEditorContent(currentQuery.sql ?? '');
      setOriginalContent(currentQuery.sql ?? '');
      setIsNewQuery(false);
      setHasUnsavedChanges(false);
      isTransitioningFromNewQueryRef.current = false;
    }
  }, [normalizedQueryId, currentQuery, queryQuery.isLoading]);

  // Track content changes
  useEffect(() => {
    let newHasUnsavedChanges = false;
    if (normalizedQueryId && !isNewQuery) {
      // For existing queries, compare current content with original
      newHasUnsavedChanges = editorContent !== originalContent;
    } else if (!normalizedQueryId || isNewQuery) {
      // For new queries, enable save if there's any content
      newHasUnsavedChanges = editorContent.trim().length > 0;
    }
    setHasUnsavedChanges(newHasUnsavedChanges);
    hasUnsavedChangesRef.current = newHasUnsavedChanges;
  }, [editorContent, originalContent, normalizedQueryId, isNewQuery]);

  const handleQuerySelect = useCallback(
    async (queryId: string) => {
      if (disabled) return;

      // Mark this as a user-initiated change
      isUserInitiatedChangeRef.current = true;

      // Normalize the selected query ID for comparison
      const normalizedSelectedId =
        queryId === '__create_new__' ? null : queryId;
      const normalizedCurrentId = normalizedQueryIdRef.current;

      // Prevent unnecessary updates if the value hasn't changed
      // This is critical to prevent infinite loops
      if (normalizedSelectedId === normalizedCurrentId) {
        isUserInitiatedChangeRef.current = false;
        return;
      }

      // Check for unsaved changes - use ref to avoid dependency
      if (hasUnsavedChangesRef.current) {
        const confirmed = await irminConfirm(
          'warning',
          dict.scripts.unsavedChangesDiscard
        );
        if (!confirmed) {
          isUserInitiatedChangeRef.current = false;
          return;
        }
      }

      if (queryId === '__create_new__') {
        // Create new query
        setIsNewQuery(true);
        setEditorContent('');
        setOriginalContent('');
        setHasUnsavedChanges(false);
        onQueryIdChangeRef.current('');
      } else {
        // Select existing query
        onQueryIdChangeRef.current(queryId);
      }

      // Reset the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isUserInitiatedChangeRef.current = false;
      }, 0);
    },
    [disabled, irminConfirm, dict]
  );

  const handleSave = useCallback(async () => {
    if (disabled) return;

    if (!normalizedQueryId || isNewQuery) {
      // Create new query - show modal
      irminModal.show(
        dict.query.createQuery || 'Create Query',
        <CreateSavedQueryModal
          workspaceSlug={workspaceSlug}
          createQuery={async (name, description, tags) => {
            try {
              const result = await createStoredQueryMutation.mutateAsync({
                name,
                description,
                sql: editorContent,
                tags: tags?.map((tag) => tag.id),
              });

              const newQueryId = result.data?.id;
              if (!newQueryId) throw new Error(dict.query.failedToCreateQuery);

              // Preserve editor content when transitioning from new query to saved query
              isTransitioningFromNewQueryRef.current = true;
              setOriginalContent(editorContent);
              setIsNewQuery(false);
              setHasUnsavedChanges(false);
              onQueryIdChangeRef.current(newQueryId);

              irminModal.close();
              // Success alert is already shown by createStoredQueryMutation.onSuccess
            } catch (error) {
              console.error('Error creating query:', error);
              irminAlert(
                'error',
                (error as Error)?.message ?? dict.query.failedToCreateQuery
              );
            }
          }}
        />
      );
    } else {
      // Update existing query
      // normalizedQueryId is guaranteed to be non-null here due to the condition above
      if (!normalizedQueryId) return;
      const queryIdToUpdate = normalizedQueryId;
      try {
        await updateStoredQueryMutation.mutateAsync({
          id: queryIdToUpdate,
          name: currentQuery?.name ?? '',
          description: currentQuery?.description ?? '',
          sql: editorContent,
        });

        setOriginalContent(editorContent);
        setHasUnsavedChanges(false);
        // Success alert is already shown by updateStoredQueryMutation.onSuccess
      } catch (error) {
        console.error('Error updating query:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? dict.query.failedToUpdateQuery
        );
      }
    }
  }, [
    disabled,
    normalizedQueryId,
    isNewQuery,
    editorContent,
    workspaceSlug,
    createStoredQueryMutation,
    updateStoredQueryMutation,
    irminModal,
    irminAlert,
    dict.query,
    currentQuery,
  ]);

  const enableSaveButton = useMemo(() => {
    if (disabled) return false;
    if (!normalizedQueryId || isNewQuery) {
      return editorContent.trim().length > 0;
    }
    return hasUnsavedChanges;
  }, [
    disabled,
    normalizedQueryId,
    isNewQuery,
    editorContent,
    hasUnsavedChanges,
  ]);

  const selectedQueryValue = useMemo(
    () => normalizedQueryId || '__create_new__',
    [normalizedQueryId]
  );

  // Store handleQuerySelect in a ref to avoid dependency issues
  const handleQuerySelectRef = useRef(handleQuerySelect);
  useEffect(() => {
    handleQuerySelectRef.current = handleQuerySelect;
  }, [handleQuerySelect]);

  // Wrapper to prevent Select from triggering updates on programmatic value changes
  const handleSelectValueChange = useCallback((queryId: string) => {
    // Only proceed if this is a user-initiated change
    // The Select component might call this when value prop changes programmatically
    const currentValue = normalizedQueryIdRef.current || '__create_new__';
    if (queryId === currentValue) {
      // Value hasn't changed, ignore - this prevents infinite loops
      return;
    }
    // Use ref to call the handler to avoid dependency issues
    handleQuerySelectRef.current(queryId);
  }, []);

  return (
    <div className='flex h-full flex-col gap-2'>
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.pipeline.executableQuery}</Label>
        <Select
          value={selectedQueryValue}
          onValueChange={handleSelectValueChange}
          disabled={disabled || storedQueriesQuery.isLoading}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder={dict.query.selectedQuery} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__create_new__'>
              {dict.query.createQuery}
            </SelectItem>
            {storedQueriesQuery.isLoading ? (
              <SelectItem value='loading' disabled>
                {dict.list.loading}
              </SelectItem>
            ) : queries.length === 0 ? (
              <SelectItem value='no-queries' disabled>
                {dict.list.noItems}
              </SelectItem>
            ) : (
              queries.map((query) => (
                <SelectItem key={query.id} value={query.id}>
                  {query.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {normalizedQueryId && (
          <Button
            href={`${workspaceUrl}/queries?query=${normalizedQueryId}`}
            target='_blank'
            variant='secondary'
            className='w-full'
            icon={<TbExternalLink />}
          >
            {dict.list.view}
          </Button>
        )}
      </div>

      {/* Editor Controls */}
      <div
        className={`
          flex items-center justify-between gap-2 border-b border-gray-200 pb-2
          dark:border-gray-800
        `}
      >
        <div className='flex items-center gap-2'>
          <SqlHelper currentSql={editorContent} />
        </div>
        <Button
          onClick={handleSave}
          variant='default'
          size='sm'
          icon={<IoSave />}
          disabled={
            !enableSaveButton ||
            disabled ||
            createStoredQueryMutation.isPending ||
            updateStoredQueryMutation.isPending
          }
        >
          {createStoredQueryMutation.isPending ||
          updateStoredQueryMutation.isPending
            ? dict.scripts.saving
            : dict.common.save}
        </Button>
      </div>

      {/* SQL Editor */}
      <div className='flex-1'>
        {queryQuery.isLoading && normalizedQueryId ? (
          <div
            className={`
              flex h-full items-center justify-center text-muted-foreground
            `}
          >
            {dict.list.loading}
          </div>
        ) : queryQuery.isError && normalizedQueryId ? (
          <div
            className={`
              flex h-full flex-col items-center justify-center gap-2
              text-muted-foreground
            `}
          >
            <p>{dict.common.somethingWentWrong}</p>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                onQueryIdChangeRef.current('');
              }}
            >
              {dict.scripts.reset}
            </Button>
          </div>
        ) : (
          <CodeMirrorEditor
            language='sql'
            content={editorContent}
            updateEditorContent={setEditorContent}
            editorHeight='400px'
            editable={!disabled}
          />
        )}
      </div>

      {/* Query Info */}
      {currentQuery && (
        <div className='text-sm text-muted-foreground'>
          <div>
            <strong>{dict.common.owner}:</strong>{' '}
            {currentQuery.owner.first_name} {currentQuery.owner.last_name}
          </div>
          {currentQuery.tags && currentQuery.tags.length > 0 && (
            <div>
              <strong>{dict.list.tags}:</strong>{' '}
              {currentQuery.tags.map((tag) => tag.name).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
