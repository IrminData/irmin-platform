'use client';

import { useEffect, useState } from 'react';

import { sql } from '@codemirror/lang-sql';
import CodeMirror from '@uiw/react-codemirror';

import { AiOutlinePlayCircle } from 'react-icons/ai';

import Button from '@/components/common/button/Button';
import TableSelector from '@/components/repository/viewer/TableSelector';
import TableViewer from '@/components/repository/viewer/TableViewer';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { RepositoryRouteParams } from './layout';

/**
 * Page for the Repository viewer
 *
 * @todo Repositories consist of multiple tables. This component should have a way to switch between tables.
 * @todo Fetch real data from Workspace DB based on the Repository
 */
export default function RepositoryPage({
  params,
}: {
  params: RepositoryRouteParams;
}) {
  const { dict } = useLocale();
  const {
    workspaces: { currentWorkspace },
    repositories: { repositories },
  } = useWorkspace();

  const repository = repositories.find(
    (repo) => repo.slug === params.repository
  );

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    if (!selectedTable) return;
    setQuery(`SELECT * FROM $[${selectedTable}]`);
  }, [selectedTable]);

  if (!repository || !currentWorkspace) return <></>;

  return (
    <>
      <div className='mb-4 flex w-full flex-col items-start gap-1 px-2 md:flex-row md:gap-2 md:px-4'>
        <div className='h-full w-max max-w-80 rounded border bg-white pb-4 shadow-sm md:px-4 md:py-2'>
          <p className='mb-0 p-2 text-sm text-irmin_blue md:mb-2'>
            {dict.repository.dataTables}
          </p>
          <TableSelector
            repository={repository}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
          />
        </div>
        <div className='relative w-full max-w-full overflow-hidden rounded border bg-white shadow-sm md:px-4 md:py-2'>
          <div className='h-full' id='code-editor'>
            <p className='mb-0 p-2 text-sm text-irmin_blue md:mb-2 md:p-0'>
              {dict.repository.sqlQuery}
            </p>
            <CodeMirror
              className='h-full w-full py-2 text-xs outline-none'
              value={query}
              extensions={[sql()]}
              placeholder={dict.editor.writeYourSQL}
              onChange={(value: string) => setQuery(value)}
              basicSetup={{
                lineNumbers: false,
              }}
            />
          </div>
          <Button
            colorScheme='primary'
            variant='solid'
            className='float-end m-2'
            size='sm'
            icon={<AiOutlinePlayCircle />}
          >
            {dict.repository.runQuery}
          </Button>
        </div>
      </div>
      {selectedTable && (
        <div className='max-w-full overflow-x-auto'>
          <TableViewer
            title={`${currentWorkspace.slug} / ${repository.slug} / ${selectedTable}`}
          />
        </div>
      )}
    </>
  );
}
