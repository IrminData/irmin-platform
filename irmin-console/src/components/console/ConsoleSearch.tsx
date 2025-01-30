'use client';

import { useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';

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

import { generateSearchItems } from '@/lib/actions/searchItems';

import { useLocale } from '@/context/LocaleContext';

import {
  ConsoleSearchItem,
  ConsoleSearchItemType,
} from '@/types/internal/ConsoleSearch';

/**
 * Search component for the Irmin console
 *
 * Find the matching search items based on the query using the filter function.
 * Comparing formatted query to formatted item titles and descriptions.
 *
 *
 * {@link ConsoleSearchItem} interface is used to represent the search items.
 *
 * Search items are grouped by type and displayed in a modal.
 *
 * @returns The console search component with search bar and results
 */
export default function ConsoleSearch() {
  const { dict } = useLocale();
  const params = useParams<{ workspace?: string }>();

  // State for query and results
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ConsoleSearchItem[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isFocused, setIsFocused] = useState(false);

  // Get the search items
  const [items, setItems] = useState<ConsoleSearchItem[]>([]);
  useEffect(() => {
    const fetchSearchItems = async () => {
      try {
        const searchItems = await generateSearchItems({
          workspace: params.workspace,
        });
        setItems(searchItems);
      } catch (error) {
        console.error('Error fetching search items:', error);
      }
    };
    fetchSearchItems();
  }, [params.workspace]);

  // Ref for the search container
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Debounce useEffect hook
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Filtering results based on the query
  useEffect(() => {
    if (debouncedQuery.length > 3) {
      // Formatting query and filtering results
      const formattedQuery = debouncedQuery
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '');
      const filteredResults = items.filter((item) => {
        const formattedTitle = item.title
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, '');
        const formattedDescription = item.description
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, '');

        // Make sure the query and the formatted title are not empty
        if (!formattedQuery || !formattedTitle) {
          return false;
        }

        // Check if the formatted title includes the formatted query or vice versa
        if (
          formattedTitle.includes(formattedQuery.toLowerCase()) ||
          formattedQuery.toLowerCase().includes(formattedTitle)
        )
          return true;

        // If the formatted description is not empty, check if it includes the formatted query or vice versa
        if (
          formattedDescription &&
          (formattedDescription.includes(formattedQuery.toLowerCase()) ||
            formattedQuery.toLowerCase().includes(formattedDescription))
        )
          return true;
      });
      setResults(filteredResults);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, items]);

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

  // Grouping results by item type
  const groupedResults = results.reduce(
    (acc, result) => {
      const type = result.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(result);
      return acc;
    },
    {} as Record<ConsoleSearchItemType, ConsoleSearchItem[]>
  );

  const getIconForType = (type: ConsoleSearchItemType) => {
    switch (type) {
      case ConsoleSearchItemType.User:
        return <TbUser size={22} />;
      case ConsoleSearchItemType.Repository:
        return <TbDatabase size={22} />;
      case ConsoleSearchItemType.StructuredObject:
        return <TbTable size={22} />;
      case ConsoleSearchItemType.BinaryObject:
        return <TbFile size={22} />;
      case ConsoleSearchItemType.GroupObject:
        return <TbFolder size={22} />;
      case ConsoleSearchItemType.Connection:
        return <GoWorkflow size={22} />;
      case ConsoleSearchItemType.Workflow:
        return <TbRun size={22} />;
      case ConsoleSearchItemType.Workspace:
        return <TbDashboard size={22} />;
      case ConsoleSearchItemType.Irmin:
      default:
        return <TbTools />;
    }
  };

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
          defaultValue={query}
          onChange={(e) => setQuery(e.target.value)}
          className='dark:bg-irmin_black/50 block w-full rounded-full bg-gray-50/50 px-4 py-3 ps-10 text-xs text-gray-900 placeholder:invisible placeholder:opacity-40 group-focus-within:placeholder:visible focus:outline-hidden md:placeholder:visible lg:text-sm dark:text-white'
          placeholder={dict.consoleNavigation.searchPlaceholder}
        />
      </form>

      {/* Results Modal */}
      {debouncedQuery.length > 3 && isFocused && (
        <div className='bg-background absolute mt-1 max-h-[calc(100vh-200px)] w-full overflow-y-scroll rounded-xl border border-gray-200 shadow-lg dark:border-gray-900'>
          {results.length > 0 ? (
            <div className='px-2 pt-2 lg:px-4 lg:pt-4'>
              {Object.keys(groupedResults).map((type) => (
                <div key={type} className='mb-2 lg:mb-4'>
                  <div className='text-primary mb-1 flex items-center pl-2 lg:mb-2'>
                    {getIconForType(type as ConsoleSearchItemType)}
                    <span className='ml-2 text-base lg:text-lg'>
                      {type === 'workflow' && dict.workflow.workflows}
                      {type === 'connection' && dict.connections.connections}
                      {type === 'repository' && dict.repository.repositories}
                      {type === 'user' && dict.workspace.users}
                      {type === 'workspace' &&
                        dict.consoleNavigation.workspaces}
                      {type === 'irmin' && dict.consoleNavigation.irmin}
                    </span>
                  </div>
                  <ul>
                    {groupedResults[type as ConsoleSearchItemType].map(
                      (result, idx) => (
                        <li
                          key={`search-result-${type}-${idx}`}
                          className='rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 lg:text-base dark:text-gray-300 dark:hover:bg-gray-700'
                        >
                          <a href={result.link} className='block'>
                            <div>{result.title}</div>
                            <div className='pt-1 text-xs opacity-80'>
                              {result.description}
                            </div>
                          </a>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className='flex h-full min-h-96 w-full flex-col items-center justify-center gap-4'>
              <LuSearchX className='h-12 w-12 text-gray-400' />
              <div className='text-base text-gray-600 lg:text-lg dark:text-gray-300'>
                {dict.common.noResults}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
