import { WorkspaceCardSkeleton } from '@/components/ui/loading/WorkspaceCardSkeleton';

export default function WorkspacesLoading() {
  return (
    <div className='pattern-bg h-full'>
      <div className='relative container mx-auto max-w-7xl'>
        <div className='flex flex-col'>
          <div className='px-4 py-28'>
            <div
              className={`
                flex flex-col gap-8
                lg:flex-row lg:gap-12
              `}
            >
              {/* Create workspace form skeleton */}
              <div
                className={`
                  w-full
                  lg:w-96 lg:shrink-0
                `}
              >
                <div className='rounded-xl bg-card p-6 ring-1 ring-border/20'>
                  <div
                    className={`
                      mb-6 h-6 w-48 animate-pulse rounded-sm bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                  <div className='space-y-4'>
                    <div
                      className={`
                        h-10 w-full animate-pulse rounded-sm bg-gray-200
                        dark:bg-gray-800
                      `}
                    />
                    <div
                      className={`
                        h-10 w-full animate-pulse rounded-sm bg-gray-200
                        dark:bg-gray-800
                      `}
                    />
                    <div
                      className={`
                        h-12 w-full animate-pulse rounded-sm bg-gray-200
                        dark:bg-gray-800
                      `}
                    />
                  </div>
                </div>
              </div>

              {/* Workspace cards grid */}
              <div className='min-w-0 flex-1'>
                <div
                  className={`
                    mb-6 h-6 w-40 animate-pulse rounded-sm bg-gray-200
                    dark:bg-gray-800
                  `}
                />
                <div
                  className={`
                    grid grid-cols-1 gap-4
                    sm:grid-cols-2
                    xl:grid-cols-3
                  `}
                >
                  <WorkspaceCardSkeleton />
                  <WorkspaceCardSkeleton />
                  <WorkspaceCardSkeleton />
                  <WorkspaceCardSkeleton />
                  <WorkspaceCardSkeleton />
                  <WorkspaceCardSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
