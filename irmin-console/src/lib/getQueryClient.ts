import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from '@tanstack/react-query';

// Type for error objects that may have a status property
interface ErrorWithStatus {
  status: number;
  [key: string]: unknown;
}

// Type guard to check if error has a status property
function hasStatus(error: unknown): error is ErrorWithStatus {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as ErrorWithStatus).status === 'number'
  );
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // Add cache time to prevent infinite caching
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        // Add retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (hasStatus(error)) {
            const status = error.status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        // Add refetch on window focus with smart logic
        refetchOnWindowFocus: (query) => {
          // Only refetch if the query is stale
          return query.state.dataUpdatedAt < Date.now() - 60 * 1000;
        },
      },
      mutations: {
        // Add retry for mutations
        retry: 1,
      },
      dehydrate: {
        // include pending queries in dehydration
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

// Cleanup function to clear the query client
export function clearQueryClient() {
  if (browserQueryClient) {
    browserQueryClient.clear();
    browserQueryClient = undefined;
  }
}

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();

      // Set up periodic cleanup of inactive queries
      const cleanupInterval = setInterval(
        () => {
          if (browserQueryClient) {
            // Remove queries that haven't been accessed recently
            const queries = browserQueryClient.getQueryCache().getAll();
            const now = Date.now();

            queries.forEach((query) => {
              // Remove queries that haven't been accessed in the last 10 minutes
              if (now - query.state.dataUpdatedAt > 10 * 60 * 1000) {
                browserQueryClient!.getQueryCache().remove(query);
              }
            });
          }
        },
        5 * 60 * 1000
      ); // Run cleanup every 5 minutes

      // Clean up interval when page unloads
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          clearInterval(cleanupInterval);
          clearQueryClient();
        });
      }
    }
    return browserQueryClient;
  }
}
