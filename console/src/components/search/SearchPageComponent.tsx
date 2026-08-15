'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import {
  TbCalendar,
  TbChevronDown,
  TbDashboard,
  TbDatabase,
  TbFile,
  TbFilter,
  TbFolder,
  TbPlugConnected,
  TbRun,
  TbSearch,
  TbTable,
  TbTools,
  TbUser,
  TbX,
} from 'react-icons/tb';

import type { Dictionary } from '@/lib/dict';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TagBadge from '@/components/ui/TagBadge';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaceSearch, useWorkspaceTags } from '@/hooks/api';
import {
  filterStaticSearchItems,
  useStaticSearchItems,
} from '@/hooks/utils/useStaticSearchItems';

import { convertSearchResultToConsoleItem } from '@/utils/search';

import type { SearchFilters, SearchResult } from '@/types/core/Search';
import type { Tag } from '@/types/core/Tag';
import type { ConsoleSearchItem } from '@/types/internal/ConsoleSearch';
import { ConsoleSearchItemType } from '@/types/internal/ConsoleSearch';

import SearchResultsSkeleton from './SearchResultsSkeleton';

// Tag selection component
function TagSelection({
  tags,
  selectedTags,
  onTagToggle,
  labelledBy,
}: {
  tags: Tag[];
  selectedTags: string[];
  onTagToggle: (tagId: string) => void;
  labelledBy: string;
}) {
  return (
    <div
      className='flex flex-wrap gap-2'
      role='group'
      aria-labelledby={labelledBy}
    >
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size='sm'
          selected={selectedTags.includes(tag.id)}
          onClick={() => onTagToggle(tag.id)}
        />
      ))}
    </div>
  );
}

// Available search types
const SEARCH_TYPES = [
  {
    value: 'repository',
    getLabel: (dict: Dictionary) => dict.repository.repositories,
    icon: <TbDatabase size={16} />,
  },
  {
    value: 'workflow',
    getLabel: (dict: Dictionary) => dict.workflow.workflows,
    icon: <TbRun size={16} />,
  },
  {
    value: 'connection',
    getLabel: (dict: Dictionary) => dict.connections.connections,
    icon: <TbPlugConnected size={16} />,
  },
  {
    value: 'repository_object',
    getLabel: (dict: Dictionary) => dict.repository.objects.objects,
    icon: <TbFile size={16} />,
  },
  {
    value: 'user',
    getLabel: (dict: Dictionary) => dict.workspace.users,
    icon: <TbUser size={16} />,
  },
  {
    value: 'irmin',
    getLabel: (dict: Dictionary) => dict.consoleNavigation.irmin,
    icon: <TbTools size={16} />,
  },
];

export default function SearchPageComponent() {
  return (
    <Suspense>
      <SearchPageComponentContent />
    </Suspense>
  );
}

function SearchPageComponentContent() {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const workspaceSlug = params.workspace as string;

  // State for search filters
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    types: searchParams.get('types')?.split(',').filter(Boolean) || [],
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    owner_id: searchParams.get('owner_id') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [accumulatedResults, setAccumulatedResults] = useState<
    ConsoleSearchItem[]
  >([]);

  // Get search results
  const { workspaceSearchQuery } = useWorkspaceSearch(filters, workspaceSlug, {
    enabled: (filters.query?.length || 0) > 0,
  });

  // Get static search items
  const { staticSearchItemsQuery } = useStaticSearchItems(workspaceSlug);

  // Get workspace tags for filtering
  const { workspaceTagsQuery } = useWorkspaceTags(workspaceSlug);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.types?.length) params.set('types', filters.types.join(','));
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.owner_id) params.set('owner_id', filters.owner_id);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.limit && filters.limit !== 50)
      params.set('limit', filters.limit.toString());
    if (filters.offset && filters.offset !== 0)
      params.set('offset', filters.offset.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  // Convert and accumulate search results
  useEffect(() => {
    // Batch all state updates in a microtask to avoid cascading renders
    queueMicrotask(() => {
      if (!filters.query || filters.query.length === 0) {
        setAccumulatedResults((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      if (filters.offset === 0) {
        // First page or new search - build combined results from scratch
        const combinedResults: ConsoleSearchItem[] = [];

        // Add static search items (filtered by query and type filters)
        const staticItems = staticSearchItemsQuery.data || [];
        const filteredStaticItems = filterStaticSearchItems(
          staticItems,
          filters.query,
          filters.types
        );

        combinedResults.push(...filteredStaticItems);

        // Add workspace search results if available
        if (workspaceSearchQuery.data?.data?.results) {
          const workspaceResults = workspaceSearchQuery.data.data.results
            .map((result: SearchResult) =>
              convertSearchResultToConsoleItem(
                dict,
                result,
                locale,
                workspaceSlug
              )
            )
            .filter((item): item is ConsoleSearchItem => item !== null)
            .filter((item) => {
              if (filters.types && filters.types.length > 0) {
                return filters.types.includes(item.type);
              }
              return true;
            });

          combinedResults.push(...workspaceResults);
        }

        setAccumulatedResults(combinedResults);
      } else {
        // Additional page - append workspace results only
        if (workspaceSearchQuery.data?.data?.results) {
          const workspaceResults = workspaceSearchQuery.data.data.results
            .map((result: SearchResult) =>
              convertSearchResultToConsoleItem(
                dict,
                result,
                locale,
                workspaceSlug
              )
            )
            .filter((item): item is ConsoleSearchItem => item !== null)
            .filter((item) => {
              if (filters.types && filters.types.length > 0) {
                return filters.types.includes(item.type);
              }
              return true;
            });

          setAccumulatedResults((prev) => [...prev, ...workspaceResults]);
        }
      }
    });
  }, [
    workspaceSearchQuery.data,
    staticSearchItemsQuery.data,
    locale,
    workspaceSlug,
    filters.query,
    filters.types,
    filters.offset,
    dict,
  ]);

  // Group results by type
  const groupedResults = useMemo(
    () =>
      accumulatedResults.reduce(
        (acc, result) => {
          const type = result.type;
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(result);
          return acc;
        },
        {} as Record<ConsoleSearchItemType, ConsoleSearchItem[]>
      ),
    [accumulatedResults]
  );

  const handleFilterChange = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters, offset: 0 }));
    },
    []
  );

  const handleTypeToggle = useCallback((type: string) => {
    setFilters((prev) => {
      const currentTypes = prev.types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];
      return { ...prev, types: newTypes, offset: 0 };
    });
  }, []);

  const handleTagToggle = useCallback((tagId: string) => {
    setFilters((prev) => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter((t) => t !== tagId)
        : [...currentTags, tagId];
      return { ...prev, tags: newTags, offset: 0 };
    });
  }, []);

  const clearSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, query: '', offset: 0 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      types: [],
      tags: [],
      owner_id: '',
      date_from: '',
      date_to: '',
      limit: 50,
      offset: 0,
    }));
  }, []);

  const handleLoadMore = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 50),
    }));
  }, []);

  const getIconForType = useCallback((type: ConsoleSearchItemType) => {
    switch (type) {
      case 'user':
        return <TbUser size={16} />;
      case 'repository':
        return <TbDatabase size={16} />;
      case 'structured-object':
        return <TbTable size={16} />;
      case 'binary-object':
        return <TbFile size={16} />;
      case 'group-object':
        return <TbFolder size={16} />;
      case 'connection':
        return <TbPlugConnected size={16} />;
      case 'workflow':
        return <TbRun size={16} />;
      case 'workspace':
        return <TbDashboard size={16} />;
      case 'irmin':
        return <TbTools size={16} />;
      default:
        return <TbTools size={16} />;
    }
  }, []);

  const totalWorkspaceResults = workspaceSearchQuery.data?.data?.total || 0;

  // Separate loading states
  const isStaticLoading = staticSearchItemsQuery.isLoading;
  const isWorkspaceLoading = workspaceSearchQuery.isLoading;
  const isTagsLoading = workspaceTagsQuery.isLoading;
  const isLoading = isStaticLoading || isWorkspaceLoading || isTagsLoading;

  const staticResultsCount = useMemo(() => {
    if (!filters.query) return 0;

    return filterStaticSearchItems(
      staticSearchItemsQuery.data || [],
      filters.query,
      filters.types
    ).length;
  }, [filters.query, filters.types, staticSearchItemsQuery.data]);

  // Static navigation entries can share the same type as API results, so
  // subtract the exact filtered static set instead of guessing by type.
  const workspaceResultsCount = Math.max(
    accumulatedResults.length - staticResultsCount,
    0
  );

  const hasMoreResults = totalWorkspaceResults > workspaceResultsCount;
  const hasActiveFilters = Boolean(
    filters.types?.length ||
    filters.tags?.length ||
    filters.owner_id ||
    filters.date_from ||
    filters.date_to ||
    (filters.limit && filters.limit !== 50)
  );
  const formattedResultCount = new Intl.NumberFormat(locale).format(
    accumulatedResults.length
  );
  const resultSummary = (
    accumulatedResults.length === 1
      ? dict.search.resultFoundForQuery
      : dict.search.resultsFoundForQuery
  )
    .replace('{count}', formattedResultCount)
    .replace('{query}', filters.query || '');
  const noResultsMessage = dict.search.noResultsFor.replace(
    '{query}',
    filters.query || ''
  );

  return (
    <div
      className='
        mx-auto max-w-6xl space-y-6 p-4
        md:p-6
      '
    >
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <DisplayTitle>{dict.common.search}</DisplayTitle>
          <p className='mt-1 text-muted-foreground'>
            {dict.search.searchDescription}
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div>
        <Label htmlFor='workspace-search-query' className='sr-only'>
          {dict.common.search}
        </Label>
        <Input
          id='workspace-search-query'
          type='search'
          value={filters.query || ''}
          onChange={(e) => handleFilterChange({ query: e.target.value })}
          icon={<TbSearch className='size-5' />}
          placeholder={dict.search.searchPlaceholder}
        />
      </div>

      {/* Filters Toggle */}
      <div className='flex items-center justify-between'>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant='secondary'
          icon={<TbFilter size={16} />}
          className='flex items-center gap-2'
          aria-expanded={showFilters}
          aria-controls='workspace-search-filters'
        >
          {dict.common.filters}
          <TbChevronDown
            className={`
              transition-transform
              ${showFilters ? 'rotate-180' : ''}
            `}
            size={16}
          />
        </Button>

        {hasActiveFilters && (
          <Button
            onClick={resetFilters}
            variant='secondary'
            icon={<TbX size={16} />}
          >
            {dict.search.resetFilters}
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      <div
        id='workspace-search-filters'
        hidden={!showFilters}
        className='space-y-6 rounded-[2px] border border-border bg-card p-6'
      >
        {/* Types Filter */}
        <fieldset>
          <legend className='type-mono-label mb-3 text-foreground'>
            {dict.search.contentTypes}
          </legend>
          <div className='flex flex-wrap gap-2'>
            {SEARCH_TYPES.map((type) => (
              <Button
                key={type.value}
                onClick={() => handleTypeToggle(type.value)}
                variant={
                  filters.types?.includes(type.value) ? 'secondary' : 'ghost'
                }
                icon={type.icon}
                size='sm'
                aria-pressed={filters.types?.includes(type.value)}
              >
                {type.getLabel(dict)}
              </Button>
            ))}
          </div>
        </fieldset>

        {/* Tags Filter */}
        {isTagsLoading ? (
          <div>
            <p
              id='workspace-search-tags-label'
              className='type-mono-label mb-3 text-foreground'
            >
              {dict.workspace.tags}
            </p>
            <div className='flex flex-wrap gap-2'>
              <div className='h-8 w-20 animate-pulse rounded-[2px] bg-muted' />
              <div className='h-8 w-16 animate-pulse rounded-[2px] bg-muted' />
              <div className='h-8 w-24 animate-pulse rounded-[2px] bg-muted' />
            </div>
          </div>
        ) : workspaceTagsQuery.data?.data &&
          workspaceTagsQuery.data.data.length > 0 ? (
          <div>
            <p
              id='workspace-search-tags-label'
              className='type-mono-label mb-3 text-foreground'
            >
              {dict.workspace.tags}
            </p>
            <TagSelection
              tags={workspaceTagsQuery.data.data}
              selectedTags={filters.tags || []}
              onTagToggle={handleTagToggle}
              labelledBy='workspace-search-tags-label'
            />
          </div>
        ) : workspaceTagsQuery.data?.data &&
          workspaceTagsQuery.data.data.length === 0 ? (
          <div>
            <p
              id='workspace-search-tags-label'
              className='type-mono-label mb-3 text-foreground'
            >
              {dict.workspace.tags}
            </p>
            <p className='text-sm text-muted-foreground'>
              {dict.list.noItemsFound}
            </p>
          </div>
        ) : workspaceTagsQuery.error ? (
          <div>
            <p
              id='workspace-search-tags-label'
              className='type-mono-label mb-3 text-foreground'
            >
              {dict.workspace.tags}
            </p>
            <QueryError
              error={workspaceTagsQuery.error}
              onRetry={() => workspaceTagsQuery.refetch()}
              title={dict.workspace.failedToLoadTags}
              size='sm'
              showRefresh={false}
            />
          </div>
        ) : null}

        {/* Date Range Filter */}
        <div
          className={`
            grid grid-cols-1 gap-4
            md:grid-cols-2
          `}
        >
          <div>
            <Label htmlFor='workspace-search-from-date' className='mb-2 block'>
              {dict.search.fromDate}
            </Label>
            <Input
              id='workspace-search-from-date'
              type='date'
              value={filters.date_from || ''}
              onChange={(e) =>
                handleFilterChange({ date_from: e.target.value })
              }
              icon={<TbCalendar className='size-5' />}
            />
          </div>
          <div>
            <Label htmlFor='workspace-search-to-date' className='mb-2 block'>
              {dict.search.toDate}
            </Label>
            <Input
              id='workspace-search-to-date'
              type='date'
              value={filters.date_to || ''}
              onChange={(e) => handleFilterChange({ date_to: e.target.value })}
              icon={<TbCalendar className='size-5' />}
            />
          </div>
        </div>

        {/* Results per page */}
        <div>
          <Label
            htmlFor='workspace-search-results-limit'
            className='mb-2 block'
          >
            {dict.search.resultsPerPage}
          </Label>
          <Select
            value={(filters.limit || 50).toString()}
            onValueChange={(value) =>
              handleFilterChange({ limit: parseInt(value) })
            }
          >
            <SelectTrigger
              id='workspace-search-results-limit'
              className='w-full'
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='10'>10</SelectItem>
              <SelectItem value='25'>25</SelectItem>
              <SelectItem value='50'>50</SelectItem>
              <SelectItem value='100'>100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className='space-y-6'>
        {/* Results Count */}
        {filters.query && (
          <div className='text-sm text-muted-foreground' aria-live='polite'>
            {isLoading && accumulatedResults.length === 0
              ? dict.search.searchingText
              : resultSummary}
          </div>
        )}

        {/* Error State */}
        {(workspaceSearchQuery.error || staticSearchItemsQuery.error) && (
          <QueryError
            error={workspaceSearchQuery.error || staticSearchItemsQuery.error}
            onRetry={() => {
              if (workspaceSearchQuery.error) workspaceSearchQuery.refetch();
            }}
            title={dict.common.errors.failedToLoadSearchResults}
            description={dict.common.errors.failedToLoadAgain}
          />
        )}

        {/* Loading State - only show when no results available */}
        {isLoading &&
          accumulatedResults.length === 0 &&
          !workspaceSearchQuery.error &&
          !staticSearchItemsQuery.error && <SearchResultsSkeleton />}

        {/* Results */}
        {filters.query && accumulatedResults.length > 0 && (
          <div className='space-y-8'>
            {Object.entries(groupedResults).map(([type, items]) => (
              <div key={type} className='space-y-4'>
                <div
                  className={`
                    flex items-center gap-2 text-lg font-medium text-foreground
                  `}
                >
                  {getIconForType(type as ConsoleSearchItemType)}
                  <span>
                    {type === 'workflow' && dict.workflow.workflows}
                    {type === 'connection' && dict.connections.connections}
                    {type === 'repository' && dict.repository.repositories}
                    {type === 'user' && dict.workspace.users}
                    {type === 'workspace' && dict.consoleNavigation.workspaces}
                    {type === 'irmin' && dict.consoleNavigation.irmin}
                    {type === 'structured-object' &&
                      dict.repository.objects.structured}
                    {type === 'binary-object' && dict.repository.objects.binary}
                    {type === 'group-object' && dict.repository.objects.group}
                  </span>
                  <span className='text-sm text-muted-foreground tabular-nums'>
                    ({items.length})
                  </span>
                </div>
                <div className='grid gap-4'>
                  {items.map((item) => (
                    <Link
                      key={`${type}-${item.link}-${item.title}`}
                      href={item.link}
                      className={`
                        block rounded-[2px] border border-border bg-card p-4
                        transition-colors
                        hover:bg-muted/50
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-accent
                      `}
                    >
                      <div className='flex items-start gap-3'>
                        {getIconForType(item.type)}
                        <div className='min-w-0 flex-1'>
                          <h3 className='truncate text-lg text-foreground'>
                            {item.title}
                          </h3>
                          <p className='mt-1 text-sm text-muted-foreground'>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMoreResults && (
              <div className='flex justify-center'>
                <Button
                  variant='secondary'
                  onClick={handleLoadMore}
                  disabled={isWorkspaceLoading}
                  loading={isWorkspaceLoading}
                  loadingText={dict.common.loading}
                >
                  {dict.common.loadMore}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!isLoading && filters.query && accumulatedResults.length === 0 && (
          <div className='py-12 text-center'>
            <div className='mb-4 text-muted-foreground/60'>
              <TbSearch size={48} className='mx-auto' />
            </div>
            <h3 className='mb-2 text-lg text-foreground'>{noResultsMessage}</h3>
            <p className='text-muted-foreground'>
              {dict.search.tryAdjustingFilters}
            </p>
            <div className='mt-5 flex flex-wrap justify-center gap-2'>
              <Button variant='secondary' onClick={clearSearch}>
                {dict.search.clearSearch}
              </Button>
              {hasActiveFilters && (
                <Button variant='ghost' onClick={resetFilters}>
                  {dict.search.resetFilters}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!filters.query && (
          <div className='py-12 text-center'>
            <div className='mb-4 text-muted-foreground/60'>
              <TbSearch size={48} className='mx-auto' />
            </div>
            <h3 className='mb-2 text-lg text-foreground'>
              {dict.search.startSearching}
            </h3>
            <p className='text-muted-foreground'>
              {dict.search.startSearchingDescription}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
