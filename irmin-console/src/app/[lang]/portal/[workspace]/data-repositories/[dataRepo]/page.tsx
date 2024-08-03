'use client';

import { useEffect, useState } from 'react';

import { sql } from '@codemirror/lang-sql';
import CodeMirror from '@uiw/react-codemirror';

import { AiOutlinePlayCircle } from 'react-icons/ai';

import DataTableSelector from '@/components/data-repository/DataTableSelector';
import DataTableViewer from '@/components/data-repository/DataTableViewer';
import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page for the Data Repository viewer
 *
 * @todo DataRepositories consist of multiple tables. This component should have a way to switch between tables.
 * @todo Fetch real data from Workspace DB based on the Data Repository
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function DataRepositoryPage({
  params,
}: {
  params: { dataRepo: string };
}) {
  const { dict } = useLocale();
  const {
    workspaces: { currentWorkspace },
    dataRepositories: { dataRepositories },
  } = useWorkspace();

  const dataRepo = dataRepositories.find(
    (repo) => repo.slug === params.dataRepo
  );

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    if (!selectedTable) return;
    setQuery(`SELECT * FROM $[${selectedTable}]`);
  }, [selectedTable]);

  if (!dataRepo || !currentWorkspace) return <></>;

  return (
    <>
      <div className='mb-4 flex w-full flex-col items-start gap-1 px-2 md:flex-row md:gap-2 md:px-4'>
        <div className='h-full w-max max-w-80 rounded border bg-white pb-4 shadow-sm md:px-4 md:py-2'>
          <p className='mb-0 p-2 text-sm text-irmin_blue md:mb-2'>
            {dict.dataRepository.dataTables}
          </p>
          <DataTableSelector
            dataRepo={dataRepo}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
          />
        </div>
        <div className='relative w-full max-w-full overflow-hidden rounded border bg-white shadow-sm md:px-4 md:py-2'>
          <div className='h-full' id='code-editor'>
            <p className='mb-0 p-2 text-sm text-irmin_blue md:mb-2 md:p-0'>
              {dict.dataRepository.sqlQuery}
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
            {dict.dataRepository.runQuery}
          </Button>
        </div>
      </div>
      {selectedTable && (
        <div className='max-w-full overflow-x-auto'>
          <DataTableViewer
            title={`${currentWorkspace.slug} / ${dataRepo.slug} / ${selectedTable}`}
          />
        </div>
      )}
    </>
  );
}
