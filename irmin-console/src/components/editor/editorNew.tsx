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
    <div className='flex h-full flex-row items-center justify-center gap-8 py-8'>
      {/* Card 1 */}
      <div
        className='flex w-96 cursor-pointer flex-col items-center rounded-lg border p-6 py-12 text-center shadow transition-all hover:opacity-40'
        onClick={addNewTab}
      >
        <FiDatabase size={48} />
        <h2 className='mt-8 text-xl font-normal'>
          {dict.editor.createNewScript}
        </h2>
        <p className='mt-4 text-sm'>{dict.editor.startExploringData}</p>
      </div>

      {/* Card 2 */}
      <div className='flex w-96 cursor-pointer flex-col items-center rounded-lg border p-6 py-12 text-center shadow transition-all hover:opacity-40'>
        <FiUser size={48} />
        <h2 className='mt-8 text-xl font-normal'>{dict.editor.hazAITitle}</h2>
        <p className='mt-4 text-sm'>{dict.editor.hazAISubtitle}</p>
      </div>
    </div>
  );
};

export default ScriptEditorNew;
