'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  TbEdit,
  TbFile,
  TbLoader2,
  TbSearch,
  TbStar,
  TbTag,
  TbVectorTriangle,
} from 'react-icons/tb';

import IrminCore from '@/lib/core';

import EmbeddingEditSheet from '@/components/repository/objects/ObjectViewer/EmbeddingEditSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useEmbeddings } from '@/hooks/api';

import type { EmbeddingSearchResult } from '@/types/core/Embedding';
import type { RepositoryObject } from '@/types/core/RepositoryObject';

interface EmbeddingViewerProps {
  object: RepositoryObject;
}

/**
 * Viewer component for embedding files.
 * Displays embedding metadata and provides a search interface.
 */
export default function EmbeddingViewer({ object }: EmbeddingViewerProps) {
  const { dict, locale } = useLocale();
  const { repository, currentRef } = useRepositoryContext();
  const { workspaceSlug } = useWorkspaceContext();
  const { getToken } = useIAM();

  const {
    searchEmbeddingsMutation,
    updateEmbeddingMetadataMutation,
    updateEmbeddingPriorityMutation,
  } = useEmbeddings(repository.slug, currentRef);

  // Fetch embedding info directly using useQuery
  const embeddingInfoQuery = useQuery({
    queryKey: [
      'embeddingInfo',
      workspaceSlug,
      repository.slug,
      object.path,
      currentRef ?? '',
    ],
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.embeddingsService.getEmbeddingInfo({
        workspace: workspaceSlug,
        repository: repository.slug,
        embeddingPath: object.path,
        ref: currentRef,
      });
    },
    enabled: !!object.path && !!repository.slug,
  });
  const embeddingInfo = embeddingInfoQuery.data?.data;

  // Derive the current state key from props to track changes
  const currentStateKey = useMemo(
    () => `${object.path}@${currentRef ?? ''}`,
    [object.path, currentRef]
  );

  // Use ref to track previous state key
  const prevStateKeyRef = useRef(currentStateKey);

  // Search state reducer
  // Includes searchContext to track which search the mutation success corresponds to
  // This prevents showing "No results found" for stale search results
  type SearchState = {
    query: string;
    topK: number;
    results: EmbeddingSearchResult[];
    searchContext: { objectPath: string; query: string; ref: string } | null;
    editingEmbedding: EmbeddingSearchResult | null;
  };

  type SearchAction =
    | { type: 'RESET' }
    | { type: 'SET_QUERY'; query: string }
    | { type: 'SET_TOP_K'; topK: number }
    | { type: 'SET_RESULTS'; results: EmbeddingSearchResult[] }
    | {
        type: 'UPDATE_RESULT';
        id: string;
        patch: Partial<EmbeddingSearchResult>;
      }
    | {
        type: 'SET_SEARCH_CONTEXT';
        context: { objectPath: string; query: string; ref: string } | null;
      }
    | {
        type: 'SET_EDITING_EMBEDDING';
        embedding: EmbeddingSearchResult | null;
      };

  const searchStateReducer = (
    state: SearchState,
    action: SearchAction
  ): SearchState => {
    switch (action.type) {
      case 'RESET':
        return {
          query: '',
          topK: 10,
          results: [],
          searchContext: null,
          editingEmbedding: null,
        };
      case 'SET_QUERY':
        return { ...state, query: action.query };
      case 'SET_TOP_K':
        return { ...state, topK: action.topK };
      case 'SET_RESULTS':
        return { ...state, results: action.results };
      case 'UPDATE_RESULT':
        return {
          ...state,
          results: state.results.map((r) =>
            r.id === action.id ? { ...r, ...action.patch } : r
          ),
        };
      case 'SET_SEARCH_CONTEXT':
        return { ...state, searchContext: action.context };
      case 'SET_EDITING_EMBEDDING':
        return { ...state, editingEmbedding: action.embedding };
      default:
        return state;
    }
  };

  const [searchState, dispatchSearchState] = useReducer(searchStateReducer, {
    query: '',
    topK: 10,
    results: [],
    searchContext: null,
    editingEmbedding: null,
  });

  // Track the latest view context so async search results can't apply stale updates.
  const currentObjectPathRef = useRef(object.path);
  const currentRefValueRef = useRef(currentRef ?? '');
  const latestSearchContextRef = useRef<SearchState['searchContext']>(null);

  useEffect(() => {
    currentObjectPathRef.current = object.path;
  }, [object.path]);

  useEffect(() => {
    currentRefValueRef.current = currentRef ?? '';
  }, [currentRef]);

  useEffect(() => {
    latestSearchContextRef.current = searchState.searchContext;
  }, [searchState.searchContext]);

  // Reset state when object or ref changes
  useEffect(() => {
    if (prevStateKeyRef.current !== currentStateKey) {
      prevStateKeyRef.current = currentStateKey;
      // Reset all search-related state when viewing a different embedding file
      dispatchSearchState({ type: 'RESET' });
      // Reset mutation state to prevent "No results found" from persisting
      searchEmbeddingsMutation.reset();
    }
  }, [currentStateKey, searchEmbeddingsMutation]);

  const handleSearch = useCallback(async () => {
    if (!searchState.query.trim()) return;

    // Capture the current object path and query to check for staleness
    const searchObjectPath = object.path;
    const searchRefValue = currentRef ?? '';
    const searchQueryValue = searchState.query.trim();

    // Set search context before starting the mutation
    const context = {
      objectPath: searchObjectPath,
      query: searchQueryValue,
      ref: searchRefValue,
    };
    dispatchSearchState({ type: 'SET_SEARCH_CONTEXT', context });

    const result = await searchEmbeddingsMutation.mutateAsync({
      query: searchQueryValue,
      embeddingPath: searchObjectPath,
      ref: searchRefValue,
      topK: searchState.topK,
    });

    // Only update results if we're still viewing the same object/ref and the latest
    // search context matches this request. This prevents race conditions when two
    // searches are initiated rapidly and results arrive out of order.
    const latestContext = latestSearchContextRef.current;
    const isStillCurrentSearch =
      currentObjectPathRef.current === searchObjectPath &&
      currentRefValueRef.current === searchRefValue &&
      latestContext?.objectPath === searchObjectPath &&
      latestContext?.ref === searchRefValue &&
      latestContext?.query === searchQueryValue;

    if (isStillCurrentSearch) {
      dispatchSearchState({
        type: 'SET_RESULTS',
        results: result.data?.results ?? [],
      });
    }
  }, [
    searchState.query,
    searchState.topK,
    object.path,
    currentRef,
    searchEmbeddingsMutation,
  ]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Handler for saving metadata
  const handleSaveMetadata = useCallback(
    async (embeddingId: string, metadata: Record<string, string>) => {
      await updateEmbeddingMetadataMutation.mutateAsync({
        embeddingPath: object.path,
        updates: { [embeddingId]: metadata },
        ref: currentRef,
      });
      // Update the single result in local state via reducer so we always
      // operate on the latest results array, avoiding race conditions with
      // concurrent searches.
      dispatchSearchState({
        type: 'UPDATE_RESULT',
        id: embeddingId,
        patch: { metadata },
      });
    },
    [object.path, currentRef, updateEmbeddingMetadataMutation]
  );

  // Handler for saving priority
  const handleSavePriority = useCallback(
    async (embeddingId: string, priority: number) => {
      await updateEmbeddingPriorityMutation.mutateAsync({
        embeddingPath: object.path,
        updates: { [embeddingId]: priority },
        ref: currentRef,
      });
      // Update the single result in local state via reducer so we always
      // operate on the latest results array, avoiding race conditions with
      // concurrent searches.
      dispatchSearchState({
        type: 'UPDATE_RESULT',
        id: embeddingId,
        patch: { priority },
      });
    },
    [object.path, currentRef, updateEmbeddingPriorityMutation]
  );

  const isSavingEmbedding =
    updateEmbeddingMetadataMutation.isPending ||
    updateEmbeddingPriorityMutation.isPending;

  return (
    <div className='flex flex-col gap-8 p-6'>
      {/* File Info & Stats */}
      <div className='flex flex-col gap-6'>
        {/* Header */}
        <div className='flex items-center gap-3'>
          <div
            className={`
              rounded-md bg-purple-100 p-2
              dark:bg-purple-900/20
            `}
          >
            <TbVectorTriangle
              className={`
                size-6 text-purple-600
                dark:text-purple-400
              `}
            />
          </div>
          <div>
            <h2 className='text-lg leading-none font-semibold tracking-tight'>
              {object.name}
            </h2>
            <p className='text-sm text-muted-foreground'>
              {dict.repository.objects.embeddingFile}
            </p>
          </div>
        </div>

        {/* Stats */}
        {embeddingInfoQuery.isLoading ? (
          <div className='flex items-center gap-2 text-muted-foreground'>
            <TbLoader2 className='size-4 animate-spin' />
            <span>{dict.common.loading}</span>
          </div>
        ) : embeddingInfoQuery.isError ? (
          <div className='text-sm text-destructive'>{dict.common.error}</div>
        ) : embeddingInfo ? (
          <div className='flex flex-wrap gap-x-12 gap-y-4 text-sm'>
            <div>
              <span className='mr-2 text-muted-foreground'>
                {dict.repository.objects.embeddingsModel}
              </span>
              <span className='font-medium'>{embeddingInfo.model}</span>
            </div>
            <div>
              <span className='mr-2 text-muted-foreground'>
                {dict.repository.objects.embeddingsDimensions}
              </span>
              <span className='font-medium'>{embeddingInfo.dimensions}</span>
            </div>
            <div>
              <span className='mr-2 text-muted-foreground'>
                {dict.repository.objects.embeddingsChunkCount}
              </span>
              <span className='font-medium'>{embeddingInfo.chunk_count}</span>
            </div>
            <div>
              <span className='mr-2 text-muted-foreground'>
                {dict.common.size}
              </span>
              <span className='font-medium'>
                {formatBytes(embeddingInfo.size_bytes)}
              </span>
            </div>
            {embeddingInfo.source_files &&
              embeddingInfo.source_files.length > 0 && (
                <div className='flex items-center gap-2'>
                  <span className='text-muted-foreground'>
                    {dict.repository.objects.embeddingsSourceFiles}
                  </span>
                  <div className='flex flex-wrap gap-1.5'>
                    {embeddingInfo.source_files.map((file) => (
                      <Badge
                        key={file}
                        variant='secondary'
                        className='font-normal'
                      >
                        {file}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ) : null}
      </div>

      <Separator />

      {/* Search Interface */}
      <div className='flex flex-col gap-6'>
        <div className='flex gap-2'>
          <div className='relative flex-1'>
            <TbSearch
              className={`
                absolute top-1/2 left-3 size-4 -translate-y-1/2
                text-muted-foreground
              `}
            />
            <Input
              id='search-query'
              placeholder={dict.repository.objects.searchVectorsPlaceholder}
              value={searchState.query}
              onChange={(e) =>
                dispatchSearchState({
                  type: 'SET_QUERY',
                  query: e.target.value,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className='h-10 pl-9'
            />
          </div>
          <div className='flex items-center gap-2'>
            <Label htmlFor='top-k' className='text-sm whitespace-nowrap'>
              {dict.repository.objects.embeddingsTopK}
            </Label>
            <Input
              id='top-k'
              type='number'
              min={1}
              max={100}
              value={searchState.topK}
              onChange={(e) =>
                dispatchSearchState({
                  type: 'SET_TOP_K',
                  topK: parseInt(e.target.value) || 10,
                })
              }
              className='h-10 w-20'
            />
            <Button
              onClick={handleSearch}
              disabled={
                !searchState.query.trim() || searchEmbeddingsMutation.isPending
              }
              className='h-10'
            >
              {searchEmbeddingsMutation.isPending ? (
                <TbLoader2 className='size-4 animate-spin' />
              ) : (
                dict.common.search
              )}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchState.results.length > 0 && (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-20'>
                    {dict.repository.objects.embeddingsScore}
                  </TableHead>
                  <TableHead>
                    {dict.repository.objects.embeddingsContent}
                  </TableHead>
                  <TableHead className='w-48'>
                    {dict.repository.objects.embeddingsSourceFile}
                  </TableHead>
                  <TableHead className='w-24 text-right'>
                    {dict.repository.objects.embeddingsChunk}
                  </TableHead>
                  <TableHead className='w-20'>
                    {dict.repository.objects.embeddingsPriority}
                  </TableHead>
                  <TableHead className='w-32'>
                    {dict.repository.objects.embeddingsMetadata}
                  </TableHead>
                  <TableHead className='w-16'>{dict.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchState.results.map((result, index) => (
                  <TableRow key={result.id || index}>
                    <TableCell>
                      <Badge
                        variant={result.score >= 0.8 ? 'default' : 'secondary'}
                        className='font-mono text-xs font-normal'
                      >
                        {(result.score * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p
                        className={`
                          line-clamp-3 max-w-xl text-sm leading-relaxed
                          text-muted-foreground
                        `}
                      >
                        {result.content}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <TbFile className='size-4 text-muted-foreground/50' />
                        <span className='truncate text-xs font-medium'>
                          {result.source_file}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <span className='font-mono text-xs text-muted-foreground'>
                        #{result.chunk_index}
                      </span>
                    </TableCell>
                    <TableCell>
                      {result.priority !== undefined && (
                        <div className='flex items-center gap-1'>
                          <TbStar
                            className={`
                              size-3
                              ${
                                result.priority >= 0.8
                                  ? 'text-yellow-500'
                                  : 'text-muted-foreground/50'
                              }
                            `}
                          />
                          <span
                            className={`font-mono text-xs text-muted-foreground`}
                          >
                            {result.priority.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.metadata &&
                        Object.keys(result.metadata).length > 0 && (
                          <div className='flex flex-wrap gap-1'>
                            {Object.entries(result.metadata)
                              .slice(0, 2)
                              .map(([key, val]) => (
                                <Badge
                                  key={key}
                                  variant='outline'
                                  className='text-xs font-normal'
                                >
                                  <TbTag className='mr-1 size-3' />
                                  {key}: {val}
                                </Badge>
                              ))}
                            {Object.keys(result.metadata).length > 2 && (
                              <Badge
                                variant='outline'
                                className='text-xs font-normal'
                              >
                                +{Object.keys(result.metadata).length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() =>
                          dispatchSearchState({
                            type: 'SET_EDITING_EMBEDDING',
                            embedding: result,
                          })
                        }
                        title={dict.common.edit}
                      >
                        <TbEdit className='size-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty state for search */}
        {searchState.results.length === 0 &&
          searchEmbeddingsMutation.isSuccess &&
          !searchEmbeddingsMutation.isPending &&
          searchState.searchContext?.objectPath === object.path &&
          searchState.searchContext?.ref === (currentRef ?? '') &&
          searchState.searchContext?.query === searchState.query.trim() && (
            <div
              className={`
                flex flex-col items-center justify-center gap-3 rounded-lg
                border border-dashed py-12 text-center text-muted-foreground
              `}
            >
              <div className='rounded-full bg-muted/50 p-3'>
                <TbSearch className='size-6' />
              </div>
              <div>
                <p className='font-medium text-foreground'>
                  {dict.repository.objects.noSearchResults}
                </p>
                <p className='text-sm'>Try adjusting your query or filters</p>
              </div>
            </div>
          )}
      </div>

      {/* Edit Sheet */}
      {searchState.editingEmbedding && (
        <EmbeddingEditSheet
          embedding={searchState.editingEmbedding}
          open={!!searchState.editingEmbedding}
          onOpenChange={(open) => {
            if (!open)
              dispatchSearchState({
                type: 'SET_EDITING_EMBEDDING',
                embedding: null,
              });
          }}
          onSaveMetadata={handleSaveMetadata}
          onSavePriority={handleSavePriority}
          isSaving={isSavingEmbedding}
        />
      )}
    </div>
  );
}
