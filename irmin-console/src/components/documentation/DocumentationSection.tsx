'use client';

import { useCallback, useRef } from 'react';

import Image from 'next/image';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';
import { usePDF } from 'react-to-pdf';

import { BsFilePdf } from 'react-icons/bs';

import Button from '@/components/common/button/Button';
import StatusBadge from '@/components/common/status/StatusBadge';
import MDXViewer from '@/components/documentation/MDXViewer';
import PortalTitle from '@/components/portal/PortalTitle';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page UI to show the full documentation for the workspace
 */
export default function DocumentationSection({
  params,
}: {
  params: WorkspaceLayoutParams;
}) {
  const { profile } = useIAM();
  const { dict, locale } = useLocale();
  const { toPDF, targetRef } = usePDF({
    filename: `${params.workspace}-documentation-${new Date().toISOString()}.pdf`,
  });
  const {
    workspaces: { currentWorkspace },
    connections: { connections },
    exports: { exports },
    actions: { actions },
    repositories: { repositories },
  } = useWorkspace();

  const pdfHeaderRef = useRef<HTMLDivElement | null>(null);

  const downloadPDF = useCallback(() => {
    pdfHeaderRef.current?.classList.remove('hidden');
    toPDF();
    pdfHeaderRef.current?.classList.add('hidden');
  }, [toPDF]);

  return (
    <div className='flex flex-col px-2 md:px-4'>
      <div className='flex flex-row items-center justify-between'>
        <PortalTitle title={dict.documentation.documentation} />
        <Button
          variant='solid'
          colorScheme='primary'
          size='sm'
          className='h-6'
          icon={<BsFilePdf />}
          onClick={downloadPDF}
        >
          {dict.documentation.downloadPDF}
        </Button>
      </div>
      <div
        className='flex flex-col bg-white px-2 py-4 md:px-4 dark:bg-irmin_black'
        ref={targetRef}
      >
        <div
          ref={pdfHeaderRef}
          className='hidden border-b-2 py-4 dark:border-gray-800'
        >
          <div className='flex w-full flex-row items-center justify-between pb-4'>
            <h1 className='font-display text-2xl font-bold text-irmin_black sm:text-3xl lg:text-5xl dark:text-white'>
              {dict.documentation.documentation}
            </h1>
            <Image
              className='block h-8 w-auto dark:hidden'
              src='/irmin-logo.svg'
              alt='Irmin logo'
              width={100}
              height={100}
            />
            <Image
              className='hidden h-8 w-auto dark:block'
              src='/irmin-logo-light.svg'
              alt='Irmin logo'
              width={100}
              height={100}
            />
          </div>
          <div className='flex w-full flex-col justify-start pb-4 text-sm text-irmin_black dark:text-gray-200'>
            <p>
              <b>{dict.documentation.createdBy}: </b>
              {profile?.name ?? '-'}
            </p>
            <p>
              <b>{dict.documentation.timestamp}: </b>
              {new Date().toLocaleString(locale ?? 'en')}
            </p>
          </div>
        </div>
        <div className='flex flex-col gap-2 border-b-2 py-4 dark:border-gray-800'>
          <p className='m-0 p-0 text-xs'>{dict.documentation.workspace}</p>
          <h2 className='m-0 mb-2 p-0 font-display text-2xl font-bold text-irmin_black md:text-4xl dark:text-white'>
            {currentWorkspace?.name ?? '-'}
          </h2>
          <p className='m-0 p-0 text-sm'>
            {currentWorkspace?.description ?? ''}
          </p>
        </div>
        {repositories.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-2xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.repositories}
            </h2>
            <div className='w-full pl-4'>
              {repositories.map((item, i) => (
                <div
                  key={`repository-${i}`}
                  className='flex flex-col gap-2 border-b py-4 dark:border-gray-800'
                >
                  <div className='flex flex-row justify-between gap-2'>
                    <h3 className='text-xl text-irmin_black dark:text-white'>
                      {item.name}
                      {item.workflow && (
                        <span className='ml-2 rounded-lg bg-irmin_light_green px-1 text-xs leading-3 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                          {item.is_immutable
                            ? dict.list.immutable
                            : dict.list.managedByWorkflow}
                        </span>
                      )}
                    </h3>
                    <StatusBadge
                      accessStatus={'private'}
                      statusLabel={'Private'}
                    />
                  </div>
                  <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                    {item.description}
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.list.owner}:{' '}
                    <span className='text-gray-800 dark:text-gray-200'>
                      {item.owner.name}
                    </span>
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.documentation.tables}:{' '}
                    {item.tables.map((table, index) => (
                      <span
                        key={`item-${item.id}-${i}-tables-${index}`}
                        className='pr-4 text-gray-800 dark:text-gray-200'
                      >
                        {/* Only show part of the table name between first and last dots */}
                        {table.split('.').slice(1, -1).join('.')}
                      </span>
                    ))}
                  </p>
                  <div className='rounded-md bg-gray-200 p-4 dark:bg-irmin_black-600'>
                    <MDXViewer content={item.documentation} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {connections.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-2xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.connections}
            </h2>
            <div className='w-full pl-4'>
              {connections.map((item, i) => (
                <div
                  key={`repository-${i}`}
                  className='flex flex-col gap-2 border-b py-4 dark:border-gray-800'
                >
                  <div className='flex flex-row justify-between gap-2'>
                    <h3 className='text-xl text-irmin_black dark:text-white'>
                      {item.name}
                    </h3>
                    <StatusBadge
                      runStatus={item.status}
                      statusLabel={item.status}
                    />
                  </div>
                  <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                    {item.description}
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.list.owner}:{' '}
                    <span className='text-gray-800 dark:text-gray-200'>
                      {item.owner.name}
                    </span>
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.list.syncInterval}:{' '}
                    <span className='text-gray-800 dark:text-gray-200'>
                      {item.cron_syntax
                        ? item.cron_syntax
                        : dict.list.notScheduled}
                    </span>
                  </p>
                  <div className='rounded-md bg-gray-200 p-4 dark:bg-irmin_black-600'>
                    <MDXViewer content={item.documentation} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {exports.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-2xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.exports}
            </h2>
            <div className='w-full pl-4'>
              {exports.map((item, i) => (
                <div
                  key={`repository-${i}`}
                  className='flex flex-col gap-2 border-b py-4 dark:border-gray-800'
                >
                  <div className='flex flex-row justify-between gap-2'>
                    <h3 className='text-xl text-irmin_black dark:text-white'>
                      {item.name}
                    </h3>
                    <StatusBadge
                      runStatus={item.status}
                      statusLabel={item.status}
                    />
                  </div>
                  <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                    {item.description}
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.list.owner}:{' '}
                    <span className='text-gray-800 dark:text-gray-200'>
                      {item.owner.name}
                    </span>
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.list.syncInterval}:{' '}
                    <span className='text-gray-800 dark:text-gray-200'>
                      {item.cron_syntax
                        ? item.cron_syntax
                        : dict.list.notScheduled}
                    </span>
                  </p>
                  <div className='rounded-md bg-gray-200 p-4 dark:bg-irmin_black-600'>
                    <MDXViewer content={item.documentation} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {actions.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-2xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.actions}
            </h2>
            <div className='w-full pl-4'>
              {actions.map((item, i) => (
                <div
                  key={`repository-${i}`}
                  className='flex flex-col gap-2 border-b py-4 dark:border-gray-800'
                >
                  <div className='flex flex-row justify-between gap-2'>
                    <h3 className='text-xl text-irmin_black dark:text-white'>
                      {item.name}
                    </h3>
                    <StatusBadge
                      runStatus={item.status}
                      statusLabel={item.status}
                    />
                  </div>
                  <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                    {item.description}
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.list.owner}:{' '}
                    <span className='text-gray-800 dark:text-gray-200'>
                      {item.owner.name}
                    </span>
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {dict.list.syncInterval}:{' '}
                    <span className='text-gray-800 dark:text-gray-200'>
                      {item.cron_syntax
                        ? item.cron_syntax
                        : dict.list.notScheduled}
                    </span>
                  </p>
                  <div className='rounded-md bg-gray-200 p-4 dark:bg-irmin_black-600'>
                    <MDXViewer content={item.documentation} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
