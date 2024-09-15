import Link from 'next/link';

import { FiDatabase } from 'react-icons/fi';
import { TbSql } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

/**
 * Script editor, when no file is selected
 * Shows two cards to create a new script or use HazAI
 */
const NewTabContent = ({ addNewTab }: { addNewTab: () => void }) => {
  const { dict } = useLocale();
  return (
    <div className='flex h-full max-h-96 flex-col items-center justify-center gap-8 px-4 py-8 sm:flex-row sm:items-stretch'>
      <button
        onClick={addNewTab}
        className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center rounded-lg border bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-40 md:p-6 md:py-12 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
      >
        <FiDatabase className='text-2xl lg:text-4xl' />
        <h2 className='mt-4 text-base font-medium lg:mt-8 lg:text-lg'>
          {dict.editor.newScriptTitle}
        </h2>
        <p className='mt-2 text-xs text-gray-600 lg:mt-4 lg:text-sm dark:text-gray-400'>
          {dict.editor.newScriptSubtitle}
        </p>
      </button>

      <Link
        href={'query'}
        className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center rounded-lg border bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-40 md:p-6 md:py-12 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
      >
        <TbSql className='text-2xl lg:text-4xl' />
        <h2 className='mt-4 text-base font-medium lg:mt-8 lg:text-lg'>
          {dict.editor.queryTitle}
        </h2>
        <p className='mt-2 text-xs text-gray-600 lg:mt-4 lg:text-sm dark:text-gray-400'>
          {dict.editor.querySubtitle}
        </p>
      </Link>
    </div>
  );
};

export default NewTabContent;
