import Link from 'next/link';

import { TbDatabase, TbFile } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

/**
 * Script editor, when no file is selected
 * Shows two cards to create a new script or use HazAI
 */
const NewTabContent = ({ addNewTab }: { addNewTab: () => void }) => {
  const { dict } = useLocale();
  return (
    <div className='pattern-bg h-screen w-full'>
      <div className='my-12 flex w-full flex-wrap items-center justify-center gap-8'>
        <button
          type='button'
          onClick={addNewTab}
          className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-80 md:p-6 md:py-8 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
        >
          <div className='aspect-square rounded-full bg-gray-200 p-4 dark:bg-gray-700'>
            <TbFile className='text-2xl lg:text-4xl' />
          </div>
          <h2 className='text-base font-medium lg:text-lg'>
            {dict.editor.newScriptTitle}
          </h2>
          <p className='text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            {dict.editor.newScriptSubtitle}
          </p>
        </button>

        <Link
          href='repositories'
          className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-80 md:p-6 md:py-8 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
        >
          <div className='aspect-square rounded-full bg-gray-200 p-4 dark:bg-gray-700'>
            <TbDatabase className='text-2xl lg:text-4xl' />
          </div>
          <h2 className='text-base font-medium lg:text-lg'>
            {dict.portalHome.browseRepositories}
          </h2>
          <p className='text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            {dict.portalHome.browseRepositoriesDescription}
          </p>
        </Link>
      </div>
    </div>
  );
};

export default NewTabContent;
