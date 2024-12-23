'use client';

import { useCallback, useRef } from 'react';

import Image from 'next/image';

import { usePDF } from 'react-to-pdf';

import { BsFilePdf } from 'react-icons/bs';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
} from '@/types/core/Workflow';

import MDXViewer from './MDXViewer';

/**
 * Page UI to show the full documentation for the workspace
 */
export default function DocumentationSection({
  connections,
  imports,
  exports,
  actions,
  repositories,
}: {
  connections: Connection[];
  imports: ImportWorkflow[];
  exports: ExportWorkflow[];
  actions: ActionWorkflow[];
  repositories: Repository[];
}) {
  const { profile } = useIAM();
  const { workspace } = useWorkspace();
  const { dict, locale } = useLocale();
  const { toPDF, targetRef } = usePDF({
    filename: `${workspace?.slug}-documentation-${new Date().toISOString()}.pdf`,
  });

  const pdfHeaderRef = useRef<HTMLDivElement | null>(null);

  const downloadPDF = useCallback(() => {
    pdfHeaderRef.current?.classList.remove('hidden');
    toPDF();
    pdfHeaderRef.current?.classList.add('hidden');
  }, [toPDF]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='flex flex-col px-2 md:px-4'>
        <Button
          variant='gray'
          size='lg'
          icon={<BsFilePdf size={16} />}
          onClick={downloadPDF}
        >
          {dict.common.actions.download}
        </Button>
        <div
          className='flex flex-col bg-background px-2 py-4 md:px-4'
          ref={targetRef}
        >
          <div
            ref={pdfHeaderRef}
            className='hidden border-b-2 py-4 dark:border-gray-800'
          >
            <div className='flex w-full flex-row items-center justify-between pb-4'>
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
            <div className='flex w-full flex-col justify-start pb-4 text-sm text-foreground dark:text-gray-200'>
              {profile && (
                <p>
                  <b>{dict.documentation.createdBy}: </b>
                  {`${profile.first_name} ${profile.last_name}`}
                  {profile.company ? ` (${profile.company})` : ''} -{' '}
                  {profile.email}
                </p>
              )}
              <p>
                <b>{dict.common.timestamp}: </b>
                {new Date().toLocaleString(locale ?? 'en')}
              </p>
            </div>
          </div>
          <div className='flex flex-col gap-4 border-b-2 py-12 dark:border-gray-800'>
            <Badge>{dict.documentation.workspace}</Badge>
            <ConsoleTitle
              title={workspace?.name ?? '-'}
              className='px-0 py-0'
            />
            <p className='m-0 p-0 text-sm'>{workspace?.description ?? ''}</p>
          </div>
          {repositories.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='text-center font-display text-2xl font-bold text-primary lg:text-4xl'>
                {dict.repository.repositories}
              </h2>
              <div className='w-full pl-4'>
                {repositories.map((item, i) => (
                  <div
                    key={`repository-${i}`}
                    className='flex flex-col gap-2 border-b py-6 dark:border-gray-800'
                  >
                    <div className='flex flex-row justify-between gap-2'>
                      <h3 className='text-xl font-semibold text-foreground'>
                        {item.name}
                      </h3>
                      <StatusBadge status={'private'} label={'private'} />
                    </div>
                    <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                      {item.description}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.list.owner}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {`${item.owner.first_name} ${item.owner.last_name}`}
                        {item.owner.company
                          ? ` (${item.owner.company})`
                          : ''} - {item.owner.email}
                      </span>
                    </p>
                    {item.documentation && item.documentation.length > 0 && (
                      <div className='rounded-md bg-card px-2 pb-6 pt-8'>
                        <MDXViewer content={item.documentation} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {connections.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='text-center font-display text-2xl font-bold text-primary lg:text-4xl'>
                {dict.connections.connections}
              </h2>
              <div className='w-full pl-4'>
                {connections.map((item, i) => (
                  <div
                    key={`connection-${i}`}
                    className='flex flex-col gap-2 border-b py-6 dark:border-gray-800'
                  >
                    <h3 className='text-xl font-semibold text-foreground'>
                      {item.name}
                    </h3>
                    <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                      {item.description}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.list.owner}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {`${item.owner.first_name} ${item.owner.last_name}`}
                        {item.owner.company
                          ? ` (${item.owner.company})`
                          : ''} - {item.owner.email}
                      </span>
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.connectors.connector}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {item.connector.name}
                      </span>
                    </p>
                    {item.documentation && item.documentation.length > 0 && (
                      <div className='rounded-md bg-card px-2 pb-6 pt-8'>
                        <MDXViewer content={item.documentation} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {imports.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='text-center font-display text-2xl font-bold text-primary lg:text-4xl'>
                {dict.workflow.importWorkflows}
              </h2>
              <div className='w-full pl-4'>
                {imports.map((item, i) => (
                  <div
                    key={`connection-${i}`}
                    className='flex flex-col gap-2 border-b py-6 dark:border-gray-800'
                  >
                    <div className='flex flex-row justify-between gap-2'>
                      <h3 className='text-xl text-foreground'>{item.name}</h3>
                      <StatusBadge status={item.status} label={item.status} />
                    </div>
                    <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                      {item.description}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.list.owner}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {`${item.owner.first_name} ${item.owner.last_name}`}
                        {item.owner.company
                          ? ` (${item.owner.company})`
                          : ''} - {item.owner.email}
                      </span>
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.workflow.schedule.workflowSchedule}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {item.schedule && item.schedule.triggers.length > 0
                          ? dict.workflow.scheduled
                          : dict.workflow.notScheduled}
                      </span>
                    </p>
                    {item.documentation && item.documentation.length > 0 && (
                      <div className='rounded-md bg-card px-2 pb-6 pt-8'>
                        <MDXViewer content={item.documentation} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {exports.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='text-center font-display text-2xl font-bold text-primary lg:text-4xl'>
                {dict.workflow.exportWorkflows}
              </h2>
              <div className='w-full pl-4'>
                {exports.map((item, i) => (
                  <div
                    key={`export-${i}`}
                    className='flex flex-col gap-2 border-b py-6 dark:border-gray-800'
                  >
                    <div className='flex flex-row justify-between gap-2'>
                      <h3 className='text-xl text-foreground'>{item.name}</h3>
                      <StatusBadge status={item.status} label={item.status} />
                    </div>
                    <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                      {item.description}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.list.owner}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {`${item.owner.first_name} ${item.owner.last_name}`}
                        {item.owner.company
                          ? ` (${item.owner.company})`
                          : ''} - {item.owner.email}
                      </span>
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.workflow.schedule.workflowSchedule}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {item.schedule && item.schedule.triggers.length > 0
                          ? dict.workflow.scheduled
                          : dict.workflow.notScheduled}
                      </span>
                    </p>
                    {item.documentation && item.documentation.length > 0 && (
                      <div className='rounded-md bg-card px-2 pb-6 pt-8'>
                        <MDXViewer content={item.documentation} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {actions.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='text-center font-display text-2xl font-bold text-primary lg:text-4xl'>
                {dict.workflow.actionWorkflows}
              </h2>
              <div className='w-full pl-4'>
                {actions.map((item, i) => (
                  <div
                    key={`actions-${i}`}
                    className='flex flex-col gap-2 border-b py-6 dark:border-gray-800'
                  >
                    <div className='flex flex-row justify-between gap-2'>
                      <h3 className='text-xl text-foreground'>{item.name}</h3>
                      <StatusBadge status={item.status} label={item.status} />
                    </div>
                    <p className='max-w-sm text-sm text-gray-600 dark:text-gray-400'>
                      {item.description}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.list.owner}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {`${item.owner.first_name} ${item.owner.last_name}`}
                        {item.owner.company
                          ? ` (${item.owner.company})`
                          : ''} - {item.owner.email}
                      </span>
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {dict.workflow.schedule.workflowSchedule}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {item.schedule && item.schedule.triggers.length > 0
                          ? dict.workflow.scheduled
                          : dict.workflow.notScheduled}
                      </span>
                    </p>
                    {item.documentation && item.documentation.length > 0 && (
                      <div className='rounded-md bg-card px-2 pb-6 pt-8'>
                        <MDXViewer content={item.documentation} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
