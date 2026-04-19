'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import { LuSearchX } from 'react-icons/lu';
import {
  TbCode,
  TbDashboard,
  TbDatabase,
  TbFile,
  TbFolder,
  TbRun,
  TbSearch,
  TbSql,
  TbTable,
  TbTools,
  TbUser,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaceSearch } from '@/hooks/api';
import {
  filterStaticSearchItems,
  useStaticSearchItems,
} from '@/hooks/utils/useStaticSearchItems';

import { convertSearchResultToConsoleItem } from '@/utils/search';

import type { SearchResult } from '@/types/core/Search';
import type { ConsoleSearchItem } from '@/types/internal/ConsoleSearch';
import { ConsoleSearchItemType } from '@/types/internal/ConsoleSearch';

import SearchResultsSkeleton from './SearchResultsSkeleton';

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

// Stable functions for useSyncExternalStore (must be outside component to avoid re-subscription)
const noopSubscribe = () => () => {};
const getIsMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const getIsMacServer = () => null;

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
  const isMac = useSyncExternalStore(noopSubscribe, getIsMac, getIsMacServer);

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

  // Debounce useEffect hook - use startTransition for non-urgent update
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(query);
      });
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
                  dict,
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
    dict,
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
      case 'user':
        return <TbUser size={12} />;
      case 'repository':
        return <TbDatabase size={12} />;
      case 'structured-object':
        return <TbTable size={12} />;
      case 'binary-object':
        return <TbFile size={12} />;
      case 'group-object':
        return <TbFolder size={12} />;
      case 'connection':
        return <GoWorkflow size={12} />;
      case 'workflow':
        return <TbRun size={12} />;
      case 'workspace':
        return <TbDashboard size={12} />;
      case 'script':
        return <TbCode size={12} />;
      case 'query':
        return <TbSql size={12} />;
      case 'irmin':
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
        className={`
          relative flex size-full flex-row items-center transition-colors
        `}
        onFocus={() => setIsFocused(true)} // Set focus state on input focus
      >
        <div
          className={`
            pointer-events-none absolute inset-y-0 inset-s-0 flex items-center
            ps-3
          `}
        >
          <TbSearch className='text-muted-foreground' aria-hidden='true' />
        </div>
        <input
          ref={inputRef}
          type='search'
          name='console-search'
          autoComplete='off'
          spellCheck={false}
          aria-label={dict.consoleNavigation.searchPlaceholder}
          role='combobox'
          aria-expanded={debouncedQuery.length > 2 && isFocused}
          // Only reference the listbox when it actually exists in the DOM.
          // The listbox mounts on (debouncedQuery.length > 2 && isFocused)
          // AND renders inside `results.length > 0`. Both conditions must
          // hold or aria-controls points at an unmounted id — which happens
          // when the user shortens the query: TanStack Query keeps stale
          // results data during the transition, so results.length stays > 0
          // briefly while debouncedQuery has already dropped below 3.
          aria-controls={
            debouncedQuery.length > 2 && isFocused && results.length > 0
              ? 'console-search-results'
              : undefined
          }
          aria-autocomplete='list'
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
          className={`
            block w-full rounded-full bg-muted/50 px-4 py-3 ps-10 pr-16 text-sm
            text-foreground
            placeholder:invisible placeholder:opacity-40
            group-focus-within:placeholder:visible
            focus:outline-hidden
            md:placeholder:visible
          `}
          placeholder={dict.consoleNavigation.searchPlaceholder}
        />
        {/* Keyboard shortcut indicator */}
        {isMac !== null && (
          <div
            className={`
              pointer-events-none absolute inset-y-0 inset-e-0 flex items-center
              pe-3
            `}
          >
            <div
              className={`
                hidden items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5
                text-xs text-muted-foreground
                md:flex
              `}
            >
              <span aria-hidden='true'>
                {isMac ? '⌘\u00a0K' : 'Ctrl\u00a0K'}
              </span>
              <span className='sr-only'>
                {dict.consoleNavigation.searchShortcutHint.replace(
                  '{mod}',
                  isMac ? 'Command' : 'Control'
                )}
              </span>
            </div>
          </div>
        )}
      </form>

      {/* Live region announces result count to screen readers.
          Gated on the fetch being settled (!isStaticLoading &&
          !isWorkspaceLoading) so AT doesn't announce "0 results" on every
          keystroke while the request is in flight — that count is
          transient noise, not signal. Once data arrives, the real count
          announces. */}
      <div role='status' aria-live='polite' className='sr-only'>
        {debouncedQuery.length > 2 &&
        isFocused &&
        !isStaticLoading &&
        !isWorkspaceLoading
          ? (results.length === 1
              ? dict.consoleNavigation.resultsCountOne
              : dict.consoleNavigation.resultsCountOther
            ).replace('{n}', String(results.length))
          : ''}
      </div>

      {/* Results popup — a plain container. The role='listbox' only wraps
          the element that actually holds role='option' items (below); the
          loading skeleton, empty-state, and Advanced Search footer must
          NOT be inside the listbox per ARIA (listbox may only own options
          or groups). */}
      {debouncedQuery.length > 2 && isFocused && (
        <div
          className={`
            absolute mt-1 flex max-h-[calc(100vh-200px)] w-full flex-col
            rounded-xl border border-border bg-background shadow-lg
          `}
        >
          <div className='flex-1 overflow-y-scroll'>
            {results.length > 0 ? (
              <div
                id='console-search-results'
                role='listbox'
                aria-label={dict.consoleNavigation.searchResults}
                className={`
                  px-2 pt-2
                  lg:px-4 lg:pt-4
                `}
              >
                {Object.keys(groupedResults).map((type) => {
                  const headerId = `search-group-${type}-header`;
                  return (
                    <div
                      key={type}
                      role='group'
                      aria-labelledby={headerId}
                      className={`
                        mb-2
                        lg:mb-4
                      `}
                    >
                      <div
                        id={headerId}
                        className={`
                          mb-1 flex items-center pl-2 opacity-70
                          lg:mb-2
                        `}
                      >
                        {getIconForType(type as ConsoleSearchItemType)}
                        <span
                          className={`
                            ml-2 text-sm
                            lg:text-base
                          `}
                        >
                          {type === 'workflow' && dict.workflow.workflows}
                          {type === 'connection' &&
                            dict.connections.connections}
                          {type === 'repository' &&
                            dict.repository.repositories}
                          {type === 'user' && dict.workspace.users}
                          {type === 'workspace' &&
                            dict.consoleNavigation.workspaces}
                          {type === 'script' && dict.consoleNavigation.scripts}
                          {type === 'query' && dict.query.queries}
                          {type === 'irmin' && dict.consoleNavigation.irmin}
                          {type === 'structured-object' && 'Structured Objects'}
                          {type === 'binary-object' && 'Binary Objects'}
                          {type === 'group-object' && 'Group Objects'}
                        </span>
                      </div>
                      {/* Render options as flat children of the group (no
                          <ul>/<li> wrappers). Per ARIA, a listbox may only
                          own `option` or `group` children, and `option`
                          elements must not contain interactive descendants.
                          So the Link itself carries role='option' — it's
                          both the navigable element and the listbox entry. */}
                      {groupedResults[type as ConsoleSearchItemType].map(
                        (result) => (
                          <Link
                            key={`search-result-${type}-${result.link}-${result.title}`}
                            href={result.link}
                            role='option'
                            aria-selected={false}
                            className={`
                              block rounded-lg p-2 text-sm text-muted-foreground
                              hover:bg-muted hover:text-foreground
                              focus-visible:ring-1 focus-visible:ring-ring
                              focus-visible:outline-none
                              lg:text-base
                            `}
                            onClick={() => setIsFocused(false)}
                          >
                            <div>{result.title}</div>
                            <div className='pt-1 text-xs opacity-80'>
                              {result.description}
                            </div>
                          </Link>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ) : isStaticLoading || isWorkspaceLoading ? (
              <SearchResultsSkeleton />
            ) : (
              <div
                className={`
                  flex size-full min-h-96 flex-col items-center justify-center
                  gap-4
                `}
              >
                <LuSearchX
                  className='size-12 text-muted-foreground/60'
                  aria-hidden='true'
                />
                <div
                  className={`
                    text-base text-muted-foreground
                    lg:text-lg
                  `}
                >
                  {dict.common.noResults}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Search Link (only in workspace) */}
          {workspaceSlug && (
            <div className='border-t border-border p-2'>
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
