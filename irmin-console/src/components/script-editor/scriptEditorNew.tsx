import React from 'react';

import Link from 'next/link';

import { FiDatabase, FiUser } from 'react-icons/fi';
import { TbDatabaseImport } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

const ScriptEditorNew = ({ addNewTab }: { addNewTab: () => void }) => {
  const { dict } = useLocale();
  const workspace = useWorkspace();
  if (!workspace.currentWorkspace) {
    return <></>;
  }

  const workspaceSlug = workspace.currentWorkspace.slug;
  return (
    <div className='flex flex-col items-center justify-center'>
      {/* Cards Container */}
      <div className='mb-16 flex justify-center space-x-8'>
        {/* Card 1 */}
        <div
          className='flex w-96 cursor-pointer flex-col items-center space-y-4 rounded-lg border p-6 text-center transition-all hover:opacity-40'
          onClick={addNewTab}
        >
          <FiDatabase size={24} />
          <h2 className='text-lg font-bold'>{dict.editor.createNewScript}</h2>
          <p>{dict.editor.startExploringData}</p>
        </div>

        {/* Card 2 */}
        <div className='flex w-96 cursor-pointer flex-col items-center space-y-4 rounded-lg border p-6 text-center transition-all hover:opacity-40'>
          <FiUser size={24} />
          <h2 className='text-lg font-bold'>{dict.editor.hazAITitle}</h2>
          <p>{dict.editor.hazAISubtitle}</p>
        </div>
      </div>

      <div className='flex w-full items-center justify-center border-t p-4'>
        <Link
          className={`flex w-96 cursor-pointer items-center justify-between rounded-lg border p-6 transition-all hover:opacity-40`}
          href={`/app/${workspaceSlug}/connections`}
        >
          <div className='flex items-center'>
            <TbDatabaseImport className='mr-2 text-xl' />
            <p className='text-base font-light'>{dict.editor.hazAISubtitle}</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ScriptEditorNew;
