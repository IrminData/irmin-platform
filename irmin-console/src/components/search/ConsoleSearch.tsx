'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import { LuSearchX } from 'react-icons/lu';
import {
  TbDashboard,
  TbDatabase,
  TbFile,
  TbFolder,
  TbRun,
  TbSearch,
  TbTable,
  TbTools,
  TbUser,
} from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import {
  filterStaticSearchItems,
  useStaticSearchItems,
} from '@/hooks/useStaticSearchItems';
import { useWorkspaceSearch } from '@/hooks/useWorkspaceSearch';

import { SearchResult } from '@/types/core/Search';
import {
  ConsoleSearchItem,
  ConsoleSearchItemType,
} from '@/types/internal/ConsoleSearch';

import SearchResultsSkeleton from './SearchResultsSkeleton';

/**
 * Convert API SearchResult to ConsoleSearchItem format
 */
function convertSearchResultToConsoleItem(
  result: SearchResult,
  locale: string,
  workspaceSlug: string
): ConsoleSearchItem | null {
  const { type } = result;

  switch (type) {
    case 'repository':
      if (result.repository) {
        return {
          title: result.repository.name,
          description: result.repository.description || '-',
          link: `/${locale}/workspace/${workspaceSlug}/repositories/${result.repository.slug}`,
          type: ConsoleSearchItemType.Repository,
        };
      }
      break;
    case 'repository_object':
      if (result.repository_object) {
        return {
          title: result.repository_object.name,
          description: `${result.repository_object.type} object`,
          link: `/${locale}/workspace/${workspaceSlug}/repositories/object?path=${result.repository_object.path}`,
          type:
            result.repository_object.type === 'structured'
              ? ConsoleSearchItemType.StructuredObject
              : result.repository_object.type === 'binary'
                ? ConsoleSearchItemType.BinaryObject
                : ConsoleSearchItemType.GroupObject,
        };
      }
      break;
    case 'workflow':
      if (result.workflow) {
        return {
          title: result.workflow.name,
          description: result.workflow.description || '-',
          link: `/${locale}/workspace/${workspaceSlug}/workflows/${result.workflow.id}`,
          type: ConsoleSearchItemType.Workflow,
        };
      }
      break;
    case 'connection':
      if (result.connection) {
        return {
          title: result.connection.name,
          description: result.connection.description || '-',
          link: `/${locale}/workspace/${workspaceSlug}/connections/${result.connection.id}`,
          type: ConsoleSearchItemType.Connection,
        };
      }
      break;
    case 'user':
      if (result.user) {
        return {
          title:
            `${result.user.first_name} ${result.user.last_name}`.trim() ||
            result.user.email,
          description: result.user.email,
          link: `/${locale}/workspace/${workspaceSlug}/settings/users`,
          type: ConsoleSearchItemType.User,
        };
      }
      break;
    default:
      return null;
  }

  return null;
}

/**
 * Search component for the Irmin console
 *
 * Combines static search items (navigation) with dynamic workspace search results.
 * Static items include navigation links, pages, and workspace management.
 * Dynamic items include repositories, workflows, connections, and other workspace assets.
 *
 * Supports keyboard shortcuts:
 * - Command+K (Mac) or Ctrl+K (Windows/Linux) to focus search
 * - Escape to blur search
 *
 * @returns The console search component with search bar and results
 */
export default function ConsoleSearch() {
  const { dict, locale } = useLocale();
  const router = useRouter();

  // Get workspace slug from params
  const params = useParams();
  const workspaceSlug = useMemo(() => {
    // Handle potential server-side rendering where params might be empty
    if (!params || typeof params !== 'object') {
      return undefined;
    }
    if (params.workspace && typeof params.workspace === 'string') {
      return params.workspace;
    }
    return undefined;
  }, [params]);

  // State for query and results
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isFocused, setIsFocused] = useState(false);

  // Refs for the search container and input
  const searchRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Detect platform for keyboard shortcut display
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Set platform detection after hydration to avoid SSR mismatch
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // Get static search items
  const { staticSearchItemsQuery } = useStaticSearchItems(workspaceSlug);

  // Get workspace search results (only when in workspace and query is long enough)
  const { workspaceSearchQuery } = useWorkspaceSearch(
    {
      query: debouncedQuery,
      limit: 20,
    },
    workspaceSlug,
    {
      enabled: !!workspaceSlug && debouncedQuery.length > 2,
    }
  );

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command+K on Mac, Ctrl+K on Windows/Linux
      if ((isMac ? event.metaKey : event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
      // Escape to close search
      else if (event.key === 'Escape' && isFocused) {
        event.preventDefault();
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMac, isFocused]);

  // Debounce useEffect hook
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Detect clicks outside the search component and close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false); // Close the modal if click outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchRef]);

  // Combine and filter results
  const results = useMemo(() => {
    if (debouncedQuery.length <= 2) {
      return [];
    }

    const combinedResults: ConsoleSearchItem[] = [];

    // Add static search items immediately when available
    const staticItems = staticSearchItemsQuery.data || [];
    const filteredStaticItems = filterStaticSearchItems(
      staticItems,
      debouncedQuery
    );

    combinedResults.push(...filteredStaticItems);

    // Add workspace search results if available
    if (workspaceSlug && workspaceSearchQuery.data?.data?.results) {
      try {
        const results = workspaceSearchQuery.data.data.results;
        if (Array.isArray(results)) {
          const dynamicItems = results
            .map((result: SearchResult) => {
              try {
                return convertSearchResultToConsoleItem(
                  result,
                  locale,
                  workspaceSlug
                );
              } catch (error) {
                console.warn('Failed to convert search result:', error);
                return null;
              }
            })
            .filter((item): item is ConsoleSearchItem => item !== null);

          combinedResults.push(...dynamicItems);
        }
      } catch (error) {
        console.warn('Failed to process workspace search results:', error);
      }
    }

    return combinedResults;
  }, [
    debouncedQuery,
    staticSearchItemsQuery.data,
    workspaceSearchQuery.data,
    workspaceSlug,
    locale,
  ]);

  // Grouping results by item type
  const groupedResults = useMemo(
    () =>
      results.reduce(
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
    [results]
  );

  const getIconForType = useCallback((type: ConsoleSearchItemType) => {
    switch (type) {
      case ConsoleSearchItemType.User:
        return <TbUser size={12} />;
      case ConsoleSearchItemType.Repository:
        return <TbDatabase size={12} />;
      case ConsoleSearchItemType.StructuredObject:
        return <TbTable size={12} />;
      case ConsoleSearchItemType.BinaryObject:
        return <TbFile size={12} />;
      case ConsoleSearchItemType.GroupObject:
        return <TbFolder size={12} />;
      case ConsoleSearchItemType.Connection:
        return <GoWorkflow size={12} />;
      case ConsoleSearchItemType.Workflow:
        return <TbRun size={12} />;
      case ConsoleSearchItemType.Workspace:
        return <TbDashboard size={12} />;
      case ConsoleSearchItemType.Irmin:
      default:
        return <TbTools size={12} />;
    }
  }, []);

  // Separate loading states
  const isStaticLoading = staticSearchItemsQuery.isLoading;
  const isWorkspaceLoading = workspaceSearchQuery.isLoading;

  return (
    <div ref={searchRef} className='relative' id='console-search'>
      <form
        className='relative flex h-full w-full flex-row items-center rounded-full border border-gray-200 transition-all dark:border-gray-800'
        onFocus={() => setIsFocused(true)} // Set focus state on input focus
      >
        <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3'>
          <TbSearch className='text-gray-500' />
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay blur to allow clicks on results
            setTimeout(() => setIsFocused(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && workspaceSlug && query.trim()) {
              e.preventDefault();
              setIsFocused(false);
              router.push(
                `/${locale}/workspace/${workspaceSlug}/search?q=${encodeURIComponent(query.trim())}`
              );
            }
          }}
          className='dark:bg-irmin_black/50 block w-full rounded-full bg-gray-50/50 px-4 py-3 ps-10 pr-16 text-xs text-gray-900 placeholder:invisible placeholder:opacity-40 group-focus-within:placeholder:visible focus:outline-hidden md:placeholder:visible lg:text-sm dark:text-white'
          placeholder={dict.consoleNavigation.searchPlaceholder}
        />
        {/* Keyboard shortcut indicator */}
        <div className='pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3'>
          <div className='hidden items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 md:flex dark:bg-gray-800 dark:text-gray-400'>
            <span>{isMac ? '⌘' : 'Ctrl'}</span>
            <span>K</span>
          </div>
        </div>
      </form>

      {/* Results Modal */}
      {debouncedQuery.length > 2 && isFocused && (
        <div className='bg-background absolute mt-1 flex max-h-[calc(100vh-200px)] w-full flex-col rounded-xl border border-gray-200 shadow-lg dark:border-gray-900'>
          <div className='flex-1 overflow-y-scroll'>
            {results.length > 0 ? (
              <div className='px-2 pt-2 lg:px-4 lg:pt-4'>
                {Object.keys(groupedResults).map((type) => (
                  <div key={type} className='mb-2 lg:mb-4'>
                    <div className='mb-1 flex items-center pl-2 opacity-70 lg:mb-2'>
                      {getIconForType(type as ConsoleSearchItemType)}
                      <span className='ml-2 text-sm lg:text-base'>
                        {type === 'workflow' && dict.workflow.workflows}
                        {type === 'connection' && dict.connections.connections}
                        {type === 'repository' && dict.repository.repositories}
                        {type === 'user' && dict.workspace.users}
                        {type === 'workspace' &&
                          dict.consoleNavigation.workspaces}
                        {type === 'irmin' && dict.consoleNavigation.irmin}
                        {type === 'structured-object' && 'Structured Objects'}
                        {type === 'binary-object' && 'Binary Objects'}
                        {type === 'group-object' && 'Group Objects'}
                      </span>
                    </div>
                    <ul>
                      {groupedResults[type as ConsoleSearchItemType].map(
                        (result, idx) => (
                          <li
                            key={`search-result-${type}-${idx}`}
                            className='rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 lg:text-base dark:text-gray-300 dark:hover:bg-gray-700'
                          >
                            <Link
                              href={result.link}
                              className='block'
                              onClick={() => setIsFocused(false)}
                            >
                              <div>{result.title}</div>
                              <div className='pt-1 text-xs opacity-80'>
                                {result.description}
                              </div>
                            </Link>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ) : isStaticLoading || isWorkspaceLoading ? (
              <SearchResultsSkeleton />
            ) : (
              <div className='flex h-full min-h-96 w-full flex-col items-center justify-center gap-4'>
                <LuSearchX className='h-12 w-12 text-gray-400' />
                <div className='text-base text-gray-600 lg:text-lg dark:text-gray-300'>
                  {dict.common.noResults}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Search Link (only in workspace) */}
          {workspaceSlug && (
            <div className='border-t border-gray-200 p-2 dark:border-gray-700'>
              <Button
                variant='gray'
                icon={<TbSearch size={16} />}
                className='w-full'
                onClick={() => {
                  setIsFocused(false);
                  router.push(
                    `/${locale}/workspace/${workspaceSlug}/search?q=${encodeURIComponent(debouncedQuery)}`
                  );
                }}
              >
                {dict.search.advancedSearch}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
