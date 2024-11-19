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

import { Collection } from '@/types/core/Collection';
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
  collections,
  imports,
  exports,
  actions,
  repositories,
}: {
  connections: Connection[];
  collections: Collection[];
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
        <div className='flex flex-row items-center justify-between'>
          <ConsoleTitle title={dict.documentation.documentation} />
          <Button
            variant='default'
            size='lg'
            icon={<BsFilePdf size={16} />}
            onClick={downloadPDF}
          >
            {dict.documentation.downloadPDF}
          </Button>
        </div>
        <div
          className='flex flex-col bg-background px-2 py-4 md:px-4'
          ref={targetRef}
        >
          <div
            ref={pdfHeaderRef}
            className='hidden border-b-2 py-4 dark:border-gray-800'
          >
            <div className='flex w-full flex-row items-center justify-between pb-4'>
              <h1 className='font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-5xl'>
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
                <b>{dict.documentation.timestamp}: </b>
                {new Date().toLocaleString(locale ?? 'en')}
              </p>
            </div>
          </div>
          <div className='flex flex-col gap-2 border-b-2 py-4 dark:border-gray-800'>
            <p className='m-0 p-0 text-xs'>{dict.documentation.workspace}</p>
            <h2 className='m-0 mb-2 p-0 font-display text-2xl font-bold text-foreground md:text-4xl'>
              {workspace?.name ?? '-'}
            </h2>
            <p className='m-0 p-0 text-sm'>{workspace?.description ?? ''}</p>
          </div>
          {repositories.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='font-display text-2xl font-bold text-foreground'>
                {dict.documentation.sections.repositories}
              </h2>
              <div className='w-full pl-4'>
                {repositories.map((item, i) => (
                  <div
                    key={`repository-${i}`}
                    className='flex flex-col gap-2 border-b py-6 dark:border-gray-800'
                  >
                    <div className='flex flex-row justify-between gap-2'>
                      <div className='text-xl text-foreground'>
                        {item.name}
                        {item.is_immutable && (
                          <Badge className='ml-2' variant='secondary'>
                            {dict.list.immutable}
                          </Badge>
                        )}
                      </div>
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
                    <p className='flex flex-wrap text-sm text-gray-600 dark:text-gray-400'>
                      <span className='pr-4'>
                        {dict.documentation.collections}:{' '}
                      </span>
                      {collections
                        .filter((a) => a.repository === item.slug)
                        .map((collection, index) => (
                          <span
                            key={`item-${item.id}-${i}-collection-${index}`}
                            className='pr-4 text-gray-800 dark:text-gray-200'
                          >
                            {collection.name}
                          </span>
                        ))}
                    </p>
                    <div className='p-4-600 rounded-md bg-gray-200'>
                      <MDXViewer content={item.documentation} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {connections.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='font-display text-2xl font-bold text-foreground'>
                {dict.documentation.sections.connections}
              </h2>
              <div className='w-full pl-4'>
                {connections.map((item, i) => (
                  <div
                    key={`connection-${i}`}
                    className='flex flex-col gap-2 border-b py-6 dark:border-gray-800'
                  >
                    <h3 className='text-xl text-foreground'>{item.name}</h3>
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
                      {dict.list.connector}:{' '}
                      <span className='text-gray-800 dark:text-gray-200'>
                        {item.connector.name}
                      </span>
                    </p>
                    <div className='p-4-600 rounded-md bg-gray-200'>
                      <MDXViewer content={item.documentation} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {imports.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='font-display text-2xl font-bold text-foreground'>
                {dict.documentation.sections.importWorkflows}
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
                    <div className='p-4-600 rounded-md bg-gray-200'>
                      <MDXViewer content={item.documentation} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {exports.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='font-display text-2xl font-bold text-foreground'>
                {dict.documentation.sections.exportWorkflows}
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
                    <div className='p-4-600 rounded-md bg-gray-200'>
                      <MDXViewer content={item.documentation} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {actions.length > 0 && (
            <div className='flex flex-col border-b-2 py-6 dark:border-gray-800'>
              <h2 className='font-display text-2xl font-bold text-foreground'>
                {dict.documentation.sections.actionWorkflows}
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
                    <div className='p-4-600 rounded-md bg-gray-200'>
                      <MDXViewer content={item.documentation} />
                    </div>
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
