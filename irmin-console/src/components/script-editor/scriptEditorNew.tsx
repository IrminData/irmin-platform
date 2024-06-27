import Link from 'next/link';
import React from 'react';
import { FiDatabase, FiUser } from 'react-icons/fi';
import { TbDatabaseImport } from 'react-icons/tb';
import { useWorkspace } from '@/context/WorkspaceContext';

const ScriptEditorNew = ({ addNewTab }: { addNewTab: () => void }) => {
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
        <button
          className='flex w-96 cursor-pointer flex-col items-center space-y-4 rounded-lg border p-6 text-center transition-all hover:opacity-40'
          onClick={addNewTab}
        >
          <FiDatabase size={24} />
          <h2 className='text-lg font-bold'>Create a new script</h2>
          <p>Start exploring your data by jumping into the code editor</p>
        </button>

        {/* Card 2 */}
        <button className='flex w-96 cursor-pointer flex-col items-center space-y-4 rounded-lg border p-6 text-center transition-all hover:opacity-40'>
          <FiUser size={24} />
          <h2 className='text-lg font-bold'>Meet Haz, Your Data Expert!</h2>
          <p>
            Haz, your AI assistant, is here to lend a hand with SQL queries,
            scripts and more!
          </p>
        </button>
      </div>

      <div className='flex w-full items-center justify-center border-t p-4'>
        <Link
          className={`flex w-96 cursor-pointer items-center justify-between rounded-lg border p-6 transition-all hover:opacity-40`}
          href={`/app/${workspaceSlug}/connections`}
        >
          <div className='flex items-center'>
            <TbDatabaseImport className='mr-2 text-xl' />
            <p className='text-base font-light'>Setup new connection</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ScriptEditorNew;
