const TabSkeleton = () => {
  return (
    <div
      className={`
        h-8 w-24 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
  );
};

const FileSkeleton = () => {
  return (
    <div className='flex items-center gap-2'>
      <div
        className={`
          size-4 animate-pulse rounded-sm bg-gray-200
          dark:bg-gray-800
        `}
      />
      <div
        className={`
          h-4 w-20 animate-pulse rounded-sm bg-gray-200
          dark:bg-gray-800
        `}
      />
    </div>
  );
};
/**
 * Skeleton for editor page
 */
const EditorSkeleton = () => {
  return (
    <div className='size-full'>
      {/* Editor tabs */}
      <div
        className={`
          border-b border-gray-200 bg-gray-50
          dark:border-gray-800 dark:bg-gray-900
        `}
      >
        <div className='flex items-center gap-2 px-4 py-2'>
          <TabSkeleton />
          <TabSkeleton />
          <TabSkeleton />
          <div
            className={`
              size-6 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
      </div>

      {/* Editor content area */}
      <div className='flex h-full'>
        {/* Main editor area */}
        <div className='flex-1 p-4'>
          <div
            className={`
              size-full animate-pulse rounded-sm bg-gray-100
              dark:bg-gray-800
            `}
          />
        </div>

        {/* Sidebar (file tree) */}
        <div
          className={`
            w-64 border-l border-gray-200 bg-gray-50 p-4
            dark:border-gray-800 dark:bg-gray-900
          `}
        >
          <div className='space-y-2'>
            <div
              className={`
                h-6 w-32 animate-pulse rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div className='space-y-1'>
              <FileSkeleton />
              <FileSkeleton />
              <FileSkeleton />
              <FileSkeleton />
              <FileSkeleton />
              <FileSkeleton />
              <FileSkeleton />
              <FileSkeleton />
            </div>
          </div>
        </div>
      </div>

      {/* Script results section */}
      <div
        className={`
          border-t border-gray-200 bg-gray-50 p-4
          dark:border-gray-800 dark:bg-gray-900
        `}
      >
        <div className='mb-2 flex items-center justify-between'>
          <div
            className={`
              h-5 w-24 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
          <div
            className={`
              h-8 w-16 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
        <div
          className={`
            h-32 w-full animate-pulse rounded-sm bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>
    </div>
  );
};

export default EditorSkeleton;
