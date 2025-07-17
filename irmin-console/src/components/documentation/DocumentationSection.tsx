'use client';

import { useCallback, useRef } from 'react';

import Image from 'next/image';

import { usePDF } from 'react-to-pdf';

import { BsFilePdf } from 'react-icons/bs';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import PageSkeleton from '@/components/ui/loading/PageSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useConnections, useRepositories, useWorkflows } from '@/hooks/api';

import MDXViewer from './MDXViewer';

/**
 * Page UI to show the full documentation for the workspace
 */
export default function DocumentationSection() {
  const { connectionsQuery } = useConnections();
  const { workflowsQuery } = useWorkflows();
  const { repositoriesQuery } = useRepositories();
  const { workspaceSlug, workspaceQuery } = useWorkspaceContext();
  const { profile } = useIAM();
  const { dict, locale } = useLocale();
  const { toPDF, targetRef } = usePDF({
    filename: `${workspaceSlug}-documentation-${new Date().toISOString()}.pdf`,
  });

  const pdfHeaderRef = useRef<HTMLDivElement | null>(null);

  const downloadPDF = useCallback(() => {
    pdfHeaderRef.current?.classList.remove('hidden');
    toPDF();
    pdfHeaderRef.current?.classList.add('hidden');
  }, [toPDF]);

  // Handle loading states
  if (
    workspaceQuery.isLoading ||
    connectionsQuery.isLoading ||
    workflowsQuery.isLoading ||
    repositoriesQuery.isLoading
  ) {
    return (
      <div className='bg-background'>
        <div className='relative container mx-auto max-w-7xl'>
          <div
            className={`
              flex flex-col px-2
              md:px-4
            `}
          >
            <PageSkeleton showHeader={true} contentRows={4} className='py-8' />
          </div>
        </div>
      </div>
    );
  }

  // Handle error states
  const errors = [
    workspaceQuery.error,
    connectionsQuery.error,
    workflowsQuery.error,
    repositoriesQuery.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return (
      <div className='bg-background'>
        <div className='relative container mx-auto max-w-7xl'>
          <div
            className={`
              flex flex-col px-2 py-8
              md:px-4
            `}
          >
            <QueryError
              error={errors[0]}
              onRetry={() => {
                if (workspaceQuery.error) workspaceQuery.refetch();
                if (connectionsQuery.error) connectionsQuery.refetch();
                if (workflowsQuery.error) workflowsQuery.refetch();
                if (repositoriesQuery.error) repositoriesQuery.refetch();
              }}
              title={dict.common.somethingWentWrong}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!workspaceQuery?.data) return null;

  const workspace = workspaceQuery.data.data;
  const workflows = workflowsQuery.data?.data ?? [];

  return (
    <div className='bg-background'>
      <div className='relative container mx-auto max-w-7xl'>
        <div
          className={`
            flex flex-col px-2
            md:px-4
          `}
        >
          <Button
            variant='gray'
            size='lg'
            icon={<BsFilePdf size={16} />}
            onClick={downloadPDF}
          >
            {dict.common.download}
          </Button>
          <div
            className={`
              flex flex-col px-2 py-4
              md:px-4
            `}
          >
            <div ref={targetRef}>
              <div
                ref={pdfHeaderRef}
                className={`
                  hidden border-b-2 py-4
                  dark:border-gray-800
                `}
              >
                <div
                  className={`
                    flex w-full flex-row items-center justify-between pb-4
                  `}
                >
                  <Image
                    className={`
                      block h-8 w-auto
                      dark:hidden
                    `}
                    src='/irmin-logo.svg'
                    alt='Irmin logo'
                    width={100}
                    height={100}
                  />
                  <Image
                    className={`
                      hidden h-8 w-auto
                      dark:block
                    `}
                    src='/irmin-logo-light.svg'
                    alt='Irmin logo'
                    width={100}
                    height={100}
                  />
                </div>
                <div
                  className={`
                    flex w-full flex-col justify-start pb-4 text-sm
                    text-foreground
                    dark:text-gray-200
                  `}
                >
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
              <div
                className={`
                  flex flex-col gap-4 border-b-2 py-12
                  dark:border-gray-800
                `}
              >
                <Badge>{dict.documentation.workspace}</Badge>
                <DisplayTitle>{workspace?.name ?? '-'}</DisplayTitle>
                <p className='m-0 p-0 text-sm'>
                  {workspace?.description ?? ''}
                </p>
              </div>
              {repositoriesQuery.data?.data?.length &&
                repositoriesQuery.data?.data?.length > 0 && (
                  <div className='flex flex-col py-6'>
                    <h2
                      className={`
                        text-2xl font-bold
                        lg:text-4xl
                      `}
                    >
                      {dict.repository.repositories}
                    </h2>
                    <div className='w-full'>
                      {repositoriesQuery.data?.data?.map((item) => (
                        <div
                          key={`repository-${item.id}`}
                          className={`
                            flex flex-col gap-2 border-b py-6
                            dark:border-gray-800
                          `}
                        >
                          <div className='flex flex-row justify-between gap-2'>
                            <h3
                              className={`text-xl font-semibold text-foreground`}
                            >
                              {item.name}
                            </h3>
                            <StatusBadge status={'private'} label={'private'} />
                          </div>
                          <p
                            className={`
                              max-w-sm text-sm text-gray-600
                              dark:text-gray-400
                            `}
                          >
                            {item.description}
                          </p>
                          <p
                            className={`
                              text-sm text-gray-600
                              dark:text-gray-400
                            `}
                          >
                            {dict.list.owner}:{' '}
                            <span
                              className={`
                                text-gray-800
                                dark:text-gray-200
                              `}
                            >
                              {`${item.owner.first_name} ${item.owner.last_name}`}
                              {item.owner.company
                                ? ` (${item.owner.company})`
                                : ''}{' '}
                              - {item.owner.email}
                            </span>
                          </p>
                          {item.documentation &&
                            item.documentation.length > 0 && (
                              <div className='rounded-md bg-card px-2 pt-8 pb-6'>
                                <MDXViewer content={item.documentation} />
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {connectionsQuery.data?.data &&
                connectionsQuery.data.data.length > 0 && (
                  <div className='flex flex-col py-6'>
                    <h2
                      className={`
                        text-2xl font-bold
                        lg:text-4xl
                      `}
                    >
                      {dict.connections.connections}
                    </h2>
                    <div className='w-full'>
                      {connectionsQuery.data?.data?.map((item) => (
                        <div
                          key={`connection-${item.id}`}
                          className={`
                            flex flex-col gap-2 border-b py-6
                            dark:border-gray-800
                          `}
                        >
                          <h3 className='text-xl font-semibold text-foreground'>
                            {item.name}
                          </h3>
                          <p
                            className={`
                              max-w-sm text-sm text-gray-600
                              dark:text-gray-400
                            `}
                          >
                            {item.description}
                          </p>
                          <p
                            className={`
                              text-sm text-gray-600
                              dark:text-gray-400
                            `}
                          >
                            {dict.list.owner}:{' '}
                            <span
                              className={`
                                text-gray-800
                                dark:text-gray-200
                              `}
                            >
                              {`${item.owner.first_name} ${item.owner.last_name}`}
                              {item.owner.company
                                ? ` (${item.owner.company})`
                                : ''}{' '}
                              - {item.owner.email}
                            </span>
                          </p>
                          <p
                            className={`
                              text-sm text-gray-600
                              dark:text-gray-400
                            `}
                          >
                            {dict.connectors.connector}:{' '}
                            <span
                              className={`
                                text-gray-800
                                dark:text-gray-200
                              `}
                            >
                              {item.connector.name}
                            </span>
                          </p>
                          {item.documentation &&
                            item.documentation.length > 0 && (
                              <div className='rounded-md bg-card px-2 pt-8 pb-6'>
                                <MDXViewer content={item.documentation} />
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {workflows.filter((item) => item.type === 'import').length > 0 &&
                !workflowsQuery.isLoading && (
                  <div
                    className={`
                      flex flex-col border-b-2 py-6
                      dark:border-gray-800
                    `}
                  >
                    <h2
                      className={`
                        text-2xl font-bold
                        lg:text-4xl
                      `}
                    >
                      {dict.workflow.importWorkflows}
                    </h2>
                    <div className='w-full'>
                      {workflows
                        .filter((item) => item.type === 'import')
                        .map((item) => (
                          <div
                            key={`connection-${item.id}`}
                            className={`
                              flex flex-col gap-2 border-b py-6
                              dark:border-gray-800
                            `}
                          >
                            <div className='flex flex-row justify-between gap-2'>
                              <h3 className='text-xl text-foreground'>
                                {item.name}
                              </h3>
                              {item.status === '' || !item.status ? (
                                <StatusBadge
                                  status='default'
                                  label={dict.workflow.noStatus}
                                />
                              ) : (
                                <StatusBadge
                                  status={item.status}
                                  label={item.status}
                                />
                              )}
                            </div>
                            <p
                              className={`
                                max-w-sm text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {item.description}
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.list.owner}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {`${item.owner.first_name} ${item.owner.last_name}`}
                                {item.owner.company
                                  ? ` (${item.owner.company})`
                                  : ''}{' '}
                                - {item.owner.email}
                              </span>
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.workflow.schedule.workflowSchedule}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {item.schedule?.triggers &&
                                item.schedule.triggers.length > 0
                                  ? dict.workflow.scheduled
                                  : dict.workflow.notScheduled}
                              </span>
                            </p>
                            {item.documentation &&
                              item.documentation.length > 0 && (
                                <div
                                  className={`rounded-md bg-card px-2 pt-8 pb-6`}
                                >
                                  <MDXViewer content={item.documentation} />
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              {workflows.filter((item) => item.type === 'export').length > 0 &&
                !workflowsQuery.isLoading && (
                  <div className='flex flex-col py-6'>
                    <h2
                      className={`
                        text-2xl font-bold
                        lg:text-4xl
                      `}
                    >
                      {dict.workflow.exportWorkflows}
                    </h2>
                    <div className='w-full'>
                      {workflows
                        .filter((item) => item.type === 'export')
                        .map((item) => (
                          <div
                            key={`export-${item.id}`}
                            className={`
                              flex flex-col gap-2 border-b py-6
                              dark:border-gray-800
                            `}
                          >
                            <div className='flex flex-row justify-between gap-2'>
                              <h3 className='text-xl text-foreground'>
                                {item.name}
                              </h3>
                              {item.status === '' || !item.status ? (
                                <StatusBadge
                                  status='default'
                                  label={dict.workflow.noStatus}
                                />
                              ) : (
                                <StatusBadge
                                  status={item.status}
                                  label={item.status}
                                />
                              )}
                            </div>
                            <p
                              className={`
                                max-w-sm text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {item.description}
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.list.owner}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {`${item.owner.first_name} ${item.owner.last_name}`}
                                {item.owner.company
                                  ? ` (${item.owner.company})`
                                  : ''}{' '}
                                - {item.owner.email}
                              </span>
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.workflow.schedule.workflowSchedule}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {item.schedule?.triggers &&
                                item.schedule.triggers.length > 0
                                  ? dict.workflow.scheduled
                                  : dict.workflow.notScheduled}
                              </span>
                            </p>
                            {item.documentation &&
                              item.documentation.length > 0 && (
                                <div
                                  className={`rounded-md bg-card px-2 pt-8 pb-6`}
                                >
                                  <MDXViewer content={item.documentation} />
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              {workflows.filter((item) => item.type === 'action').length > 0 &&
                !workflowsQuery.isLoading && (
                  <div className='flex flex-col py-6'>
                    <h2
                      className={`
                        text-2xl font-bold
                        lg:text-4xl
                      `}
                    >
                      {dict.workflow.actionWorkflows}
                    </h2>
                    <div className='w-full'>
                      {workflows
                        .filter((item) => item.type === 'action')
                        .map((item) => (
                          <div
                            key={`actions-${item.id}`}
                            className={`
                              flex flex-col gap-2 border-b py-6
                              dark:border-gray-800
                            `}
                          >
                            <div className='flex flex-row justify-between gap-2'>
                              <h3 className='text-xl text-foreground'>
                                {item.name}
                              </h3>
                              {item.status === '' || !item.status ? (
                                <StatusBadge
                                  status='default'
                                  label={dict.workflow.noStatus}
                                />
                              ) : (
                                <StatusBadge
                                  status={item.status}
                                  label={item.status}
                                />
                              )}
                            </div>
                            <p
                              className={`
                                max-w-sm text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {item.description}
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.list.owner}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {`${item.owner.first_name} ${item.owner.last_name}`}
                                {item.owner.company
                                  ? ` (${item.owner.company})`
                                  : ''}{' '}
                                - {item.owner.email}
                              </span>
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.workflow.schedule.workflowSchedule}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {item.schedule?.triggers &&
                                item.schedule.triggers.length > 0
                                  ? dict.workflow.scheduled
                                  : dict.workflow.notScheduled}
                              </span>
                            </p>
                            {item.documentation &&
                              item.documentation.length > 0 && (
                                <div
                                  className={`rounded-md bg-card px-2 pt-8 pb-6`}
                                >
                                  <MDXViewer content={item.documentation} />
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              {workflows.filter((item) => item.type === 'pipeline').length >
                0 &&
                !workflowsQuery.isLoading && (
                  <div className='flex flex-col py-6'>
                    <h2
                      className={`
                        text-2xl font-bold
                        lg:text-4xl
                      `}
                    >
                      {dict.workflow.pipelineWorkflows}
                    </h2>
                    <div className='w-full'>
                      {workflows
                        .filter((item) => item.type === 'pipeline')
                        .map((item) => (
                          <div
                            key={`actions-${item.id}`}
                            className={`
                              flex flex-col gap-2 border-b py-6
                              dark:border-gray-800
                            `}
                          >
                            <div className='flex flex-row justify-between gap-2'>
                              <h3 className='text-xl text-foreground'>
                                {item.name}
                              </h3>
                              {item.status === '' || !item.status ? (
                                <StatusBadge
                                  status='default'
                                  label={dict.workflow.noStatus}
                                />
                              ) : (
                                <StatusBadge
                                  status={item.status}
                                  label={item.status}
                                />
                              )}
                            </div>
                            <p
                              className={`
                                max-w-sm text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {item.description}
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.list.owner}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {`${item.owner.first_name} ${item.owner.last_name}`}
                                {item.owner.company
                                  ? ` (${item.owner.company})`
                                  : ''}{' '}
                                - {item.owner.email}
                              </span>
                            </p>
                            <p
                              className={`
                                text-sm text-gray-600
                                dark:text-gray-400
                              `}
                            >
                              {dict.workflow.schedule.workflowSchedule}:{' '}
                              <span
                                className={`
                                  text-gray-800
                                  dark:text-gray-200
                                `}
                              >
                                {item.schedule?.triggers &&
                                item.schedule.triggers.length > 0
                                  ? dict.workflow.scheduled
                                  : dict.workflow.notScheduled}
                              </span>
                            </p>
                            {item.documentation &&
                              item.documentation.length > 0 && (
                                <div
                                  className={`rounded-md bg-card px-2 pt-8 pb-6`}
                                >
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
      </div>
    </div>
  );
}
