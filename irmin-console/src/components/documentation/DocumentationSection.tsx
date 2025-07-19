'use client';

import { useCallback, useRef, useState } from 'react';

import Image from 'next/image';

import { usePDF } from 'react-to-pdf';

import {
  BsArrowUpRight,
  BsCalendar3,
  BsDatabase,
  BsEye,
  BsFilePdf,
  BsGear,
  BsGrid3X3Gap,
  BsList,
  BsPersonFill,
  BsSearch,
} from 'react-icons/bs';
import {
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlinePlay,
  HiOutlineUpload,
} from 'react-icons/hi';
import { TbClipboardX, TbFileX, TbSettingsX } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import DisplayTitle from '@/components/ui/display-title';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import { Input } from '@/components/ui/input';
import DocumentationSkeleton from '@/components/ui/loading/DocumentationSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useConnections, useRepositories, useWorkflows } from '@/hooks/api';

import MDXViewer from './MDXViewer';

/**
 * Modern documentation section with improved UX and visual design
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

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const pdfHeaderRef = useRef<HTMLDivElement | null>(null);

  const downloadPDF = useCallback(() => {
    pdfHeaderRef.current?.classList.remove('hidden');
    toPDF();
    pdfHeaderRef.current?.classList.add('hidden');
  }, [toPDF]);

  // Handle loading states with improved skeleton
  if (
    workspaceQuery.isLoading ||
    connectionsQuery.isLoading ||
    workflowsQuery.isLoading ||
    repositoriesQuery.isLoading
  ) {
    return (
      <DocumentationSkeleton
        showHero={true}
        showStats={true}
        showControls={true}
        contentSections={4}
      />
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
      <div
        className={`
          min-h-screen bg-gradient-to-br from-background via-secondary/20
          to-accent/10
        `}
      >
        <div className='relative container mx-auto max-w-7xl'>
          <div
            className={`
              flex flex-col px-4 py-8
              md:px-8
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
  const repositories = repositoriesQuery.data?.data ?? [];
  const connections = connectionsQuery.data?.data ?? [];

  // Statistics
  const stats = {
    repositories: repositories.length,
    connections: connections.length,
    totalWorkflows: workflows.length,
    importWorkflows: workflows.filter((w) => w.type === 'import').length,
    exportWorkflows: workflows.filter((w) => w.type === 'export').length,
    actionWorkflows: workflows.filter((w) => w.type === 'action').length,
    pipelineWorkflows: workflows.filter((w) => w.type === 'pipeline').length,
    scheduledWorkflows: workflows.filter(
      (w) => w.schedule?.triggers && w.schedule.triggers.length > 0
    ).length,
  };

  // Base interface for items that can be filtered
  interface BaseFilterableItem {
    name?: string;
    description?: string;
    owner?: {
      first_name?: string;
      last_name?: string;
    };
  }

  // Filter function using generics
  const filterItems = <T extends BaseFilterableItem>(
    items: T[],
    searchTerm: string
  ): T[] => {
    if (!searchTerm) return items;
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.owner?.first_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.owner?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredRepositories = filterItems(repositories, searchTerm);
  const filteredConnections = filterItems(connections, searchTerm);
  const filteredWorkflows = filterItems(workflows, searchTerm);

  // Navigation items
  const navigationSections = [
    { id: 'overview', label: 'Overview', icon: <HiOutlineDocumentText /> },
    {
      id: 'repositories',
      label: 'Repositories',
      icon: <HiOutlineCollection />,
      count: repositories.length,
    },
    {
      id: 'connections',
      label: 'Connections',
      icon: <HiOutlineCog />,
      count: connections.length,
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <HiOutlinePlay />,
      count: workflows.length,
    },
  ];

  // Check if workspace is completely empty
  const isWorkspaceEmpty =
    repositories.length === 0 &&
    connections.length === 0 &&
    workflows.length === 0;

  if (isWorkspaceEmpty) {
    return (
      <div
        className={`
          min-h-screen bg-gradient-to-br from-background via-secondary/20
          to-accent/10
        `}
      >
        <div className='relative container mx-auto max-w-7xl'>
          <div
            className={`
              flex flex-col px-4 py-8
              md:px-8
            `}
          >
            {/* Header */}
            <div className='mb-8'>
              <div className='mb-6 flex items-center gap-3'>
                <div className='rounded-xl bg-primary/10 p-3'>
                  <HiOutlineDocumentText className='size-8 text-primary' />
                </div>
                <Badge variant='secondary' className='text-sm font-medium'>
                  {dict.documentation.workspace}
                </Badge>
              </div>
              <DisplayTitle
                className={`
                  mb-4 bg-gradient-to-r from-foreground to-foreground/70
                  bg-clip-text text-4xl font-bold text-transparent
                  lg:text-6xl
                `}
              >
                {workspace?.name ?? 'Workspace Documentation'}
              </DisplayTitle>
              <p
                className={`
                  mb-8 max-w-2xl text-xl leading-relaxed text-muted-foreground
                `}
              >
                {workspace?.description ||
                  'Complete documentation for your workspace including repositories, connections, and workflows.'}
              </p>
            </div>

            {/* Empty State */}
            <EmptyState
              icon={<TbFileX className='size-full' />}
              title='No Documentation Available'
              description="This workspace doesn't have any repositories, connections, or workflows yet. Start by creating your first component to begin building your documentation."
              size='lg'
              action={{
                label: 'Get Started',
                href: `/${locale}/workspace/${workspaceSlug}`,
                variant: 'default',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        min-h-screen bg-gradient-to-br from-background via-secondary/20
        to-accent/10
      `}
    >
      <div className='relative container mx-auto max-w-7xl'>
        {/* Hero Section */}
        <div
          className={`
            relative px-4 py-12
            md:px-8
          `}
        >
          <div
            className={`
              flex flex-col gap-8
              lg:flex-row lg:items-center lg:justify-between
            `}
          >
            <div className='flex-1'>
              <div className='mb-6 flex items-center gap-3'>
                <div className='rounded-xl bg-primary/10 p-3'>
                  <HiOutlineDocumentText className='size-8 text-primary' />
                </div>
                <Badge variant='secondary' className='text-sm font-medium'>
                  {dict.documentation.workspace}
                </Badge>
              </div>
              <DisplayTitle
                className={`
                  mb-4 bg-gradient-to-r from-foreground to-foreground/70
                  bg-clip-text text-4xl font-bold text-transparent
                  lg:text-6xl
                `}
              >
                {workspace?.name ?? 'Workspace Documentation'}
              </DisplayTitle>
              <p
                className={`
                  mb-8 max-w-2xl text-xl leading-relaxed text-muted-foreground
                `}
              >
                {workspace?.description ||
                  'Complete documentation for your workspace including repositories, connections, and workflows.'}
              </p>

              {/* Action Buttons */}
              <div className='flex flex-wrap gap-4'>
                <Button
                  variant='default'
                  size='lg'
                  icon={<BsFilePdf size={18} />}
                  onClick={downloadPDF}
                  className={`
                    shadow-lg transition-all duration-200
                    hover:shadow-xl
                  `}
                >
                  {dict.common.download} PDF
                </Button>
                <Button
                  variant='outline'
                  size='lg'
                  icon={<BsEye size={18} />}
                  className={`
                    shadow-sm transition-all duration-200
                    hover:shadow-md
                  `}
                >
                  Quick Overview
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div
              className={`
                grid grid-cols-2 gap-4
                lg:min-w-[280px] lg:grid-cols-1
              `}
            >
              <Card
                className={`
                  border-border/50 bg-card/50 shadow-lg backdrop-blur-sm
                `}
              >
                <CardContent className='p-6'>
                  <div className='flex items-center gap-3'>
                    <div className='rounded-lg bg-blue-500/10 p-2'>
                      <BsDatabase className='size-5 text-blue-600' />
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-foreground'>
                        {stats.repositories}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        Repositories
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`
                  border-border/50 bg-card/50 shadow-lg backdrop-blur-sm
                `}
              >
                <CardContent className='p-6'>
                  <div className='flex items-center gap-3'>
                    <div className='rounded-lg bg-green-500/10 p-2'>
                      <BsGear className='size-5 text-green-600' />
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-foreground'>
                        {stats.connections}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        Connections
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`
                  col-span-2 border-border/50 bg-card/50 shadow-lg
                  backdrop-blur-sm
                  lg:col-span-1
                `}
              >
                <CardContent className='p-6'>
                  <div className='flex items-center gap-3'>
                    <div className='rounded-lg bg-purple-500/10 p-2'>
                      <HiOutlinePlay className='size-5 text-purple-600' />
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-foreground'>
                        {stats.totalWorkflows}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        Total Workflows
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div
          className={`
            mb-8 px-4
            md:px-8
          `}
        >
          <div
            className={`
              rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg
              backdrop-blur-sm
            `}
          >
            <div
              className={`
                flex flex-col gap-6
                lg:flex-row lg:items-center lg:justify-between
              `}
            >
              {/* Navigation Pills */}
              <div className='flex flex-wrap gap-2'>
                {navigationSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={
                      activeSection === section.id ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => {
                      setActiveSection(
                        activeSection === section.id ? null : section.id
                      );
                      const element = document.getElementById(section.id);
                      if (element) {
                        element.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }
                    }}
                    className={`
                      flex items-center gap-2 transition-all duration-200
                    `}
                  >
                    {section.icon}
                    {section.label}
                    {section.count !== undefined && (
                      <Badge variant='secondary' className='ml-1 text-xs'>
                        {section.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* Search & View Controls */}
              <div className='flex items-center gap-4'>
                <div className='relative'>
                  <BsSearch
                    className={`
                      absolute top-1/2 left-3 size-4 -translate-y-1/2 transform
                      text-muted-foreground
                    `}
                  />
                  <Input
                    placeholder='Search documentation...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='w-64 border-border/50 bg-background/50 pl-10'
                  />
                </div>
                <div className='flex items-center rounded-lg bg-muted/30 p-1'>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size='sm'
                    onClick={() => setViewMode('grid')}
                    className='size-8 p-0'
                  >
                    <BsGrid3X3Gap className='size-4' />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size='sm'
                    onClick={() => setViewMode('list')}
                    className='size-8 p-0'
                  >
                    <BsList className='size-4' />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div
          className={`
            px-4 pb-16
            md:px-8
          `}
        >
          <div ref={targetRef}>
            {/* PDF Header (hidden by default) */}
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

            {/* Overview Section */}
            <section id='overview' className='mb-16'>
              <div className='mb-12 text-center'>
                <h2 className='mb-4 text-3xl font-bold text-foreground'>
                  Workspace Overview
                </h2>
                <p className='mx-auto max-w-3xl text-lg text-muted-foreground'>
                  A comprehensive view of your workspace components and their
                  current status.
                </p>
              </div>

              <div
                className={`
                  mb-12 grid grid-cols-1 gap-6
                  md:grid-cols-2
                  lg:grid-cols-4
                `}
              >
                {/* Workflow Type Stats */}
                <Card
                  className={`
                    border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100
                    dark:border-blue-800/50 dark:from-blue-950/30
                    dark:to-blue-900/30
                  `}
                >
                  <CardContent className='p-6'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p
                          className={`
                            text-sm font-medium text-blue-600
                            dark:text-blue-400
                          `}
                        >
                          Import Workflows
                        </p>
                        <p
                          className={`
                            text-2xl font-bold text-blue-900
                            dark:text-blue-100
                          `}
                        >
                          {stats.importWorkflows}
                        </p>
                      </div>
                      <HiOutlineDownload className='size-8 text-blue-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`
                    border-green-200 bg-gradient-to-br from-green-50
                    to-green-100
                    dark:border-green-800/50 dark:from-green-950/30
                    dark:to-green-900/30
                  `}
                >
                  <CardContent className='p-6'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p
                          className={`
                            text-sm font-medium text-green-600
                            dark:text-green-400
                          `}
                        >
                          Export Workflows
                        </p>
                        <p
                          className={`
                            text-2xl font-bold text-green-900
                            dark:text-green-100
                          `}
                        >
                          {stats.exportWorkflows}
                        </p>
                      </div>
                      <HiOutlineUpload className='size-8 text-green-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`
                    border-purple-200 bg-gradient-to-br from-purple-50
                    to-purple-100
                    dark:border-purple-800/50 dark:from-purple-950/30
                    dark:to-purple-900/30
                  `}
                >
                  <CardContent className='p-6'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p
                          className={`
                            text-sm font-medium text-purple-600
                            dark:text-purple-400
                          `}
                        >
                          Action Workflows
                        </p>
                        <p
                          className={`
                            text-2xl font-bold text-purple-900
                            dark:text-purple-100
                          `}
                        >
                          {stats.actionWorkflows}
                        </p>
                      </div>
                      <HiOutlinePlay className='size-8 text-purple-500' />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`
                    border-orange-200 bg-gradient-to-br from-orange-50
                    to-orange-100
                    dark:border-orange-800/50 dark:from-orange-950/30
                    dark:to-orange-900/30
                  `}
                >
                  <CardContent className='p-6'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p
                          className={`
                            text-sm font-medium text-orange-600
                            dark:text-orange-400
                          `}
                        >
                          Scheduled
                        </p>
                        <p
                          className={`
                            text-2xl font-bold text-orange-900
                            dark:text-orange-100
                          `}
                        >
                          {stats.scheduledWorkflows}
                        </p>
                      </div>
                      <BsCalendar3 className='size-8 text-orange-500' />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Repositories Section */}
            {repositories.length > 0 ? (
              filteredRepositories.length > 0 ? (
                <section id='repositories' className='mb-16'>
                  <div className='mb-8 flex items-center gap-4'>
                    <div className='rounded-xl bg-blue-500/10 p-3'>
                      <HiOutlineCollection className='size-6 text-blue-600' />
                    </div>
                    <div>
                      <h2 className='text-3xl font-bold text-foreground'>
                        {dict.repository.repositories}
                      </h2>
                      <p className='text-muted-foreground'>
                        Data repositories in your workspace
                      </p>
                    </div>
                  </div>

                  <div
                    className={`
                      grid gap-6
                      ${
                        viewMode === 'grid'
                          ? `
                            grid-cols-1
                            lg:grid-cols-2
                          `
                          : `grid-cols-1`
                      }
                    `}
                  >
                    {filteredRepositories.map((item) => (
                      <Card
                        key={`repository-${item.id}`}
                        className={`
                          group border-border/50 bg-card/50 shadow-lg
                          backdrop-blur-sm transition-all duration-200
                          hover:shadow-xl
                        `}
                      >
                        <CardHeader className='pb-4'>
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <CardTitle
                                className={`
                                  mb-2 text-xl font-semibold text-foreground
                                  transition-colors
                                  group-hover:text-primary
                                `}
                              >
                                {item.name}
                              </CardTitle>
                              <div className='mb-3 flex items-center gap-2'>
                                <StatusBadge status='private' label='Private' />
                                <Badge variant='outline' className='text-xs'>
                                  Repository
                                </Badge>
                              </div>
                            </div>
                            <BsArrowUpRight
                              className={`
                                size-5 text-muted-foreground transition-colors
                                group-hover:text-primary
                              `}
                            />
                          </div>
                          <CardDescription className='text-sm leading-relaxed'>
                            {item.description}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className='pt-0'>
                          <div
                            className={`
                              mb-4 flex items-center gap-2 text-sm
                              text-muted-foreground
                            `}
                          >
                            <BsPersonFill className='size-4' />
                            <span className='font-medium text-foreground'>
                              {`${item.owner.first_name} ${item.owner.last_name}`}
                              {item.owner.company
                                ? ` (${item.owner.company})`
                                : ''}
                            </span>
                            <span>•</span>
                            <span>{item.owner.email}</span>
                          </div>

                          {item.documentation &&
                            item.documentation.length > 0 && (
                              <div
                                className={`
                                  rounded-xl border border-border/30
                                  bg-secondary/30 p-4
                                `}
                              >
                                <MDXViewer content={item.documentation} />
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : (
                <section id='repositories' className='mb-16'>
                  <div className='mb-8 flex items-center gap-4'>
                    <div className='rounded-xl bg-blue-500/10 p-3'>
                      <HiOutlineCollection className='size-6 text-blue-600' />
                    </div>
                    <div>
                      <h2 className='text-3xl font-bold text-foreground'>
                        {dict.repository.repositories}
                      </h2>
                      <p className='text-muted-foreground'>
                        Data repositories in your workspace
                      </p>
                    </div>
                  </div>

                  <EmptyState
                    icon={<TbClipboardX className='size-full' />}
                    title='No Repositories Match Your Search'
                    description={`No repositories found matching "${searchTerm}". Try adjusting your search terms or clear the search to see all repositories.`}
                    size='md'
                    action={{
                      label: 'Clear Search',
                      onClick: () => setSearchTerm(''),
                      variant: 'outline',
                    }}
                  />
                </section>
              )
            ) : null}

            {/* Connections Section */}
            {connections.length > 0 ? (
              filteredConnections.length > 0 ? (
                <section id='connections' className='mb-16'>
                  <div className='mb-8 flex items-center gap-4'>
                    <div className='rounded-xl bg-green-500/10 p-3'>
                      <HiOutlineCog className='size-6 text-green-600' />
                    </div>
                    <div>
                      <h2 className='text-3xl font-bold text-foreground'>
                        {dict.connections.connections}
                      </h2>
                      <p className='text-muted-foreground'>
                        External system connections
                      </p>
                    </div>
                  </div>

                  <div
                    className={`
                      grid gap-6
                      ${
                        viewMode === 'grid'
                          ? `
                            grid-cols-1
                            lg:grid-cols-2
                          `
                          : `grid-cols-1`
                      }
                    `}
                  >
                    {filteredConnections.map((item) => (
                      <Card
                        key={`connection-${item.id}`}
                        className={`
                          group border-border/50 bg-card/50 shadow-lg
                          backdrop-blur-sm transition-all duration-200
                          hover:shadow-xl
                        `}
                      >
                        <CardHeader className='pb-4'>
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <CardTitle
                                className={`
                                  mb-2 text-xl font-semibold text-foreground
                                  transition-colors
                                  group-hover:text-primary
                                `}
                              >
                                {item.name}
                              </CardTitle>
                              <div className='mb-3 flex items-center gap-2'>
                                <Badge variant='secondary' className='text-xs'>
                                  {item.connector.name}
                                </Badge>
                                <Badge variant='outline' className='text-xs'>
                                  Connection
                                </Badge>
                              </div>
                            </div>
                            <BsArrowUpRight
                              className={`
                                size-5 text-muted-foreground transition-colors
                                group-hover:text-primary
                              `}
                            />
                          </div>
                          <CardDescription className='text-sm leading-relaxed'>
                            {item.description}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className='pt-0'>
                          <div
                            className={`
                              mb-4 flex items-center gap-2 text-sm
                              text-muted-foreground
                            `}
                          >
                            <BsPersonFill className='size-4' />
                            <span className='font-medium text-foreground'>
                              {`${item.owner.first_name} ${item.owner.last_name}`}
                              {item.owner.company
                                ? ` (${item.owner.company})`
                                : ''}
                            </span>
                            <span>•</span>
                            <span>{item.owner.email}</span>
                          </div>

                          {item.documentation &&
                            item.documentation.length > 0 && (
                              <div
                                className={`
                                  rounded-xl border border-border/30
                                  bg-secondary/30 p-4
                                `}
                              >
                                <MDXViewer content={item.documentation} />
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : (
                <section id='connections' className='mb-16'>
                  <div className='mb-8 flex items-center gap-4'>
                    <div className='rounded-xl bg-green-500/10 p-3'>
                      <HiOutlineCog className='size-6 text-green-600' />
                    </div>
                    <div>
                      <h2 className='text-3xl font-bold text-foreground'>
                        {dict.connections.connections}
                      </h2>
                      <p className='text-muted-foreground'>
                        External system connections
                      </p>
                    </div>
                  </div>

                  <EmptyState
                    icon={<TbSettingsX className='size-full' />}
                    title='No Connections Match Your Search'
                    description={`No connections found matching "${searchTerm}". Try adjusting your search terms or clear the search to see all connections.`}
                    size='md'
                    action={{
                      label: 'Clear Search',
                      onClick: () => setSearchTerm(''),
                      variant: 'outline',
                    }}
                  />
                </section>
              )
            ) : null}

            {/* Workflows Section */}
            {workflows.length > 0 ? (
              filteredWorkflows.length > 0 ? (
                <section id='workflows' className='mb-16'>
                  <div className='mb-8 flex items-center gap-4'>
                    <div className='rounded-xl bg-purple-500/10 p-3'>
                      <HiOutlinePlay className='size-6 text-purple-600' />
                    </div>
                    <div>
                      <h2 className='text-3xl font-bold text-foreground'>
                        Workflows
                      </h2>
                      <p className='text-muted-foreground'>
                        Automated processes and data pipelines
                      </p>
                    </div>
                  </div>

                  {/* Workflow Type Sections */}
                  {['import', 'export', 'action', 'pipeline'].map(
                    (workflowType) => {
                      const typeWorkflows = filteredWorkflows.filter(
                        (w) => w.type === workflowType
                      );
                      if (typeWorkflows.length === 0) return null;

                      const typeConfig = {
                        import: {
                          title: dict.workflow.importWorkflows,
                          icon: <HiOutlineDownload className='size-5' />,
                          color: 'blue',
                        },
                        export: {
                          title: dict.workflow.exportWorkflows,
                          icon: <HiOutlineUpload className='size-5' />,
                          color: 'green',
                        },
                        action: {
                          title: dict.workflow.actionWorkflows,
                          icon: <HiOutlinePlay className='size-5' />,
                          color: 'purple',
                        },
                        pipeline: {
                          title: dict.workflow.pipelineWorkflows,
                          icon: <HiOutlineCog className='size-5' />,
                          color: 'orange',
                        },
                      };

                      const config =
                        typeConfig[workflowType as keyof typeof typeConfig];

                      return (
                        <div key={workflowType} className='mb-12'>
                          <div className='mb-6 flex items-center gap-3'>
                            <div
                              className={`
                                rounded-lg p-2
                                ${
                                  config.color === 'blue'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : config.color === 'green'
                                      ? 'bg-green-500/10 text-green-600'
                                      : config.color === 'purple'
                                        ? 'bg-purple-500/10 text-purple-600'
                                        : 'bg-orange-500/10 text-orange-600'
                                }
                              `}
                            >
                              {config.icon}
                            </div>
                            <h3 className='text-2xl font-bold text-foreground'>
                              {config.title}
                            </h3>
                            <Badge variant='secondary' className='text-sm'>
                              {typeWorkflows.length}
                            </Badge>
                          </div>

                          <div
                            className={`
                              grid gap-6
                              ${
                                viewMode === 'grid'
                                  ? `
                                    grid-cols-1
                                    lg:grid-cols-2
                                  `
                                  : `grid-cols-1`
                              }
                            `}
                          >
                            {typeWorkflows.map((item) => (
                              <Card
                                key={`${workflowType}-${item.id}`}
                                className={`
                                  group border-border/50 bg-card/50 shadow-lg
                                  backdrop-blur-sm transition-all duration-200
                                  hover:shadow-xl
                                `}
                              >
                                <CardHeader className='pb-4'>
                                  <div
                                    className={`
                                      flex items-start justify-between
                                    `}
                                  >
                                    <div className='flex-1'>
                                      <CardTitle
                                        className={`
                                          mb-2 text-xl font-semibold
                                          text-foreground transition-colors
                                          group-hover:text-primary
                                        `}
                                      >
                                        {item.name}
                                      </CardTitle>
                                      <div
                                        className={`
                                          mb-3 flex items-center gap-2
                                        `}
                                      >
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
                                        <Badge
                                          variant='outline'
                                          className='text-xs capitalize'
                                        >
                                          {workflowType}
                                        </Badge>
                                        {item.schedule?.triggers &&
                                          item.schedule.triggers.length > 0 && (
                                            <Badge
                                              variant='secondary'
                                              className={`
                                                flex items-center gap-1 text-xs
                                              `}
                                            >
                                              <BsCalendar3 className='size-3' />
                                              Scheduled
                                            </Badge>
                                          )}
                                      </div>
                                    </div>
                                    <BsArrowUpRight
                                      className={`
                                        size-5 text-muted-foreground
                                        transition-colors
                                        group-hover:text-primary
                                      `}
                                    />
                                  </div>
                                  <CardDescription
                                    className={`text-sm leading-relaxed`}
                                  >
                                    {item.description}
                                  </CardDescription>
                                </CardHeader>

                                <CardContent className='pt-0'>
                                  <div className='mb-4 space-y-3'>
                                    <div
                                      className={`
                                        flex items-center gap-2 text-sm
                                        text-muted-foreground
                                      `}
                                    >
                                      <BsPersonFill className='size-4' />
                                      <span
                                        className={`font-medium text-foreground`}
                                      >
                                        {`${item.owner.first_name} ${item.owner.last_name}`}
                                        {item.owner.company
                                          ? ` (${item.owner.company})`
                                          : ''}
                                      </span>
                                      <span>•</span>
                                      <span>{item.owner.email}</span>
                                    </div>

                                    <div
                                      className={`
                                        flex items-center gap-2 text-sm
                                        text-muted-foreground
                                      `}
                                    >
                                      <BsCalendar3 className='size-4' />
                                      <span
                                        className={`font-medium text-foreground`}
                                      >
                                        {item.schedule?.triggers &&
                                        item.schedule.triggers.length > 0
                                          ? dict.workflow.scheduled
                                          : dict.workflow.notScheduled}
                                      </span>
                                    </div>
                                  </div>

                                  {item.documentation &&
                                    item.documentation.length > 0 && (
                                      <div
                                        className={`
                                          rounded-xl border border-border/30
                                          bg-secondary/30 p-4
                                        `}
                                      >
                                        <MDXViewer
                                          content={item.documentation}
                                        />
                                      </div>
                                    )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </section>
              ) : (
                <section id='workflows' className='mb-16'>
                  <div className='mb-8 flex items-center gap-4'>
                    <div className='rounded-xl bg-purple-500/10 p-3'>
                      <HiOutlinePlay className='size-6 text-purple-600' />
                    </div>
                    <div>
                      <h2 className='text-3xl font-bold text-foreground'>
                        Workflows
                      </h2>
                      <p className='text-muted-foreground'>
                        Automated processes and data pipelines
                      </p>
                    </div>
                  </div>

                  <EmptyState
                    icon={<TbSettingsX className='size-full' />}
                    title='No Workflows Match Your Search'
                    description={`No workflows found matching "${searchTerm}". Try adjusting your search terms or clear the search to see all workflows.`}
                    size='md'
                    action={{
                      label: 'Clear Search',
                      onClick: () => setSearchTerm(''),
                      variant: 'outline',
                    }}
                  />
                </section>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
