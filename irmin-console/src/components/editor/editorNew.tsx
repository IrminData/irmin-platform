import React from 'react';

import { FiDatabase, FiUser } from 'react-icons/fi';

import { useLocale } from '@/context/LocaleContext';

/**
 * Script editor, when no file is selected
 * Shows two cards to create a new script or use HazAI
 */
const ScriptEditorNew = ({ addNewTab }: { addNewTab: () => void }) => {
  const { dict } = useLocale();
  return (
    <div className='flex h-full flex-col items-center justify-center gap-8 px-4 py-8 sm:flex-row sm:items-stretch'>
      <button
        className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center rounded-lg border bg-white p-4 text-center shadow transition-all hover:opacity-40 md:p-6 md:py-12'
        onClick={addNewTab}
        aria-label={'Create new editor tab'}
      >
        <FiDatabase className='text-2xl text-irmin_blue lg:text-4xl' />
        <h2 className='mt-4 text-base font-medium text-irmin_blue lg:mt-8 lg:text-lg'>
          {dict.editor.createNewScript}
        </h2>
        <p className='mt-2 text-xs text-gray-600 lg:mt-4 lg:text-sm'>
          {dict.editor.startExploringData}
        </p>
      </button>

      <button
        aria-label='Take me to HazAI'
        className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center rounded-lg border bg-white p-4 text-center shadow transition-all hover:opacity-40 md:p-6 md:py-12'
      >
        <FiUser className='text-2xl text-irmin_blue lg:text-4xl' />
        <h2 className='mt-4 text-base font-medium text-irmin_blue lg:mt-8 lg:text-lg'>
          {dict.editor.hazAITitle}
        </h2>
        <p className='mt-2 text-xs text-gray-600 lg:mt-4 lg:text-sm'>
          {dict.editor.hazAISubtitle}
        </p>
      </button>
    </div>
  );
};

export default ScriptEditorNew;
