'use client';

import { memo, useCallback, useMemo } from 'react';

import {
  TbAlertCircle,
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbClock,
  TbFilter,
  TbRefresh,
  TbTool,
  TbX,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';

import { useAIApplicationToolLogs } from '@/hooks/api';

import { cn } from '@/utils/tw';

import type { AIApplicationToolLog } from '@/types/core/AIApplication';

/**
 * Skeleton row for loading state
 */
const ToolLogSkeletonRow = () => {
  return (
    <div
      className={`
        flex animate-pulse items-center gap-4 rounded-lg bg-card/80 p-3
      `}
    >
      <div
        className={`
          size-8 rounded-sm bg-gray-300
          dark:bg-gray-700
        `}
      />
      <div className='flex-1'>
        <div
          className={`
            mb-2 h-4 w-1/3 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
        <div
          className={`
            h-3 w-2/3 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
      </div>
      <div className='flex flex-col gap-1'>
        <div
          className={`
            h-3 w-20 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
        <div
          className={`
            h-3 w-16 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
      </div>
    </div>
  );
};

/**
 * Component to display a single tool log entry
 */
const ToolLogEntry = memo(function ToolLogEntry({
  log,
  locale,
  noInputsText,
}: {
  log: AIApplicationToolLog;
  locale: string;
  noInputsText: string;
}) {
  const inputsPreview = useMemo(() => {
    try {
      const inputs = JSON.parse(log.inputs_json);
      if (typeof inputs === 'object' && inputs !== null) {
        const keys = Object.keys(inputs);
        if (keys.length === 0) return noInputsText;
        // Show first 2-3 key-value pairs
        const preview = keys
          .slice(0, 3)
          .map((key) => {
            const value = inputs[key];
            const valueStr =
              typeof value === 'string'
                ? value.length > 30
                  ? `${value.slice(0, 30)}...`
                  : value
                : JSON.stringify(value).slice(0, 30);
            return `${key}: ${valueStr}`;
          })
          .join(', ');
        return keys.length > 3 ? `${preview}, ...` : preview;
      }
      return noInputsText;
    } catch {
      return noInputsText;
    }
  }, [log.inputs_json, noInputsText]);

  return (
    <div
      className={cn(
        `
          flex flex-col gap-3 rounded-lg bg-card/80 p-3 transition-colors
          hover:bg-card/90
          md:flex-row md:items-center
        `,
        !log.success && 'border-l-2 border-l-destructive'
      )}
    >
      {/* Status icon */}
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          log.success
            ? `
              bg-green-100 text-green-600
              dark:bg-green-900/30 dark:text-green-400
            `
            : `
              bg-red-100 text-red-600
              dark:bg-red-900/30 dark:text-red-400
            `
        )}
      >
        {log.success ? <TbCheck size={16} /> : <TbX size={16} />}
      </div>

      {/* Main content */}
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span
            className={`
              font-medium text-gray-900
              dark:text-gray-100
            `}
          >
            {log.tool_name}
          </span>
          <span
            className={`
              rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600
              dark:bg-gray-700 dark:text-gray-400
            `}
          >
            {log.tool_type || 'built-in'}
          </span>
          <span
            className={`
              rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600
              uppercase
              dark:bg-blue-900/30 dark:text-blue-400
            `}
          >
            {log.protocol}
          </span>
        </div>
        <p
          className={`
            mt-1 truncate text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          {inputsPreview}
        </p>
        {!log.success && log.error_msg && (
          <p
            className={`
              mt-1 truncate text-sm text-red-600
              dark:text-red-400
            `}
          >
            {log.error_msg}
          </p>
        )}
      </div>

      {/* Metadata */}
      <div
        className={`
          flex shrink-0 flex-row items-center gap-4
          md:flex-col md:items-end md:gap-1
        `}
      >
        <div className='flex items-center gap-1 text-xs text-gray-500'>
          <TbClock size={12} />
          <span>{log.duration_ms}ms</span>
        </div>
        <span
          className={`
            text-xs text-gray-500
            dark:text-gray-400
          `}
        >
          {new Date(log.created_at).toLocaleString(locale)}
        </span>
        {log.request_ip && (
          <span
            className={`
              text-xs text-gray-400
              dark:text-gray-500
            `}
          >
            {log.request_ip}
          </span>
        )}
      </div>
    </div>
  );
});

/**
 * Stats card component
 */
const StatCard = ({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'error';
}) => {
  return (
    <div
      className={cn(
        `
          flex items-center gap-3 rounded-lg border bg-card/50 p-3
          dark:border-gray-800
        `,
        variant === 'success' &&
          `
            border-green-200
            dark:border-green-900/50
          `,
        variant === 'error' &&
          `
            border-red-200
            dark:border-red-900/50
          `
      )}
    >
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-full',
          variant === 'default' &&
            `
              bg-gray-100
              dark:bg-gray-800
            `,
          variant === 'success' &&
            `
              bg-green-100 text-green-600
              dark:bg-green-900/30 dark:text-green-400
            `,
          variant === 'error' &&
            `
              bg-red-100 text-red-600
              dark:bg-red-900/30 dark:text-red-400
            `
        )}
      >
        {icon}
      </div>
      <div>
        <p
          className={`
            text-2xl font-semibold text-gray-900
            dark:text-gray-100
          `}
        >
          {value}
        </p>
        <p
          className={`
            text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          {label}
        </p>
      </div>
    </div>
  );
};

/**
 * AI Application Activity section component
 *
 * Displays tool call audit logs for an AI Application with filtering and pagination.
 */
const AIApplicationActivitySection = () => {
  return (
    <SafeComponent
      level='section'
      title='AI Application Activity Error'
      description='The AI Application activity section encountered an error. Please try refreshing the page.'
    >
      <AIApplicationActivitySectionContent />
    </SafeComponent>
  );
};

const AIApplicationActivitySectionContent = () => {
  const { dict, locale } = useLocale();

  const {
    logs,
    stats,
    totalLogs,
    loading,
    statsLoading,
    error,
    currentPage,
    totalPages,
    limit,
    nextPage,
    prevPage,
    setPageSize,
    toolNameFilter,
    successFilter,
    filterByToolName,
    filterBySuccess,
    clearFilters,
    refresh,
  } = useAIApplicationToolLogs();

  // Get unique tool names from stats for filter dropdown
  const toolNames = useMemo(() => {
    if (!stats?.by_tool) return [];
    return stats.by_tool.map((t) => t.tool_name);
  }, [stats]);

  const handleToolNameFilterChange = useCallback(
    (value: string) => {
      filterByToolName(value === 'all' ? undefined : value);
    },
    [filterByToolName]
  );

  const handleSuccessFilterChange = useCallback(
    (value: string) => {
      if (value === 'all') {
        filterBySuccess(undefined);
      } else if (value === 'success') {
        filterBySuccess(true);
      } else {
        filterBySuccess(false);
      }
    },
    [filterBySuccess]
  );

  const hasActiveFilters =
    toolNameFilter !== undefined || successFilter !== undefined;

  // Show error state if the query failed
  if (error) {
    return (
      <ContentWrapper className='mt-4'>
        <QueryError
          error={error}
          title={dict.aiApplication.activity}
          description={dict.common.somethingWentWrong}
          onRetry={refresh}
        />
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper className='mt-4'>
      {/* Header with title and description */}
      <div className='mb-6'>
        <h2
          className={`
            text-lg font-semibold text-gray-900
            dark:text-gray-100
          `}
        >
          {dict.aiApplication.activity}
        </h2>
        <p
          className={`
            text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          {dict.aiApplication.activityDescription}
        </p>
      </div>

      {/* Stats cards */}
      {!statsLoading && stats && (
        <div
          className={`
            mb-6 grid grid-cols-2 gap-4
            lg:grid-cols-4
          `}
        >
          <StatCard
            label={dict.aiApplication.toolCalls}
            value={stats.total_calls}
            icon={<TbTool size={20} />}
          />
          <StatCard
            label={dict.common.successful}
            value={stats.successful_calls}
            icon={<TbCheck size={20} />}
            variant='success'
          />
          <StatCard
            label={dict.common.failed}
            value={stats.failed_calls}
            icon={<TbAlertCircle size={20} />}
            variant='error'
          />
          <StatCard
            label={dict.aiApplication.avgDuration}
            value={`${Math.round(stats.avg_duration_ms)}ms`}
            icon={<TbClock size={20} />}
          />
        </div>
      )}

      {/* Filters and actions */}
      <div
        className={`
          mb-4 flex flex-col gap-3
          sm:flex-row sm:items-center sm:justify-between
        `}
      >
        <div className='flex flex-wrap items-center gap-2'>
          {/* Tool name filter */}
          <Select
            value={toolNameFilter ?? 'all'}
            onValueChange={handleToolNameFilterChange}
          >
            <SelectTrigger className='w-40'>
              <TbFilter size={14} className='mr-1' />
              <SelectValue placeholder='All tools' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{dict.common.all}</SelectItem>
              {toolNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Success filter */}
          <Select
            value={
              successFilter === undefined
                ? 'all'
                : successFilter
                  ? 'success'
                  : 'error'
            }
            onValueChange={handleSuccessFilterChange}
          >
            <SelectTrigger className='w-32'>
              <SelectValue placeholder='All status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{dict.common.all}</SelectItem>
              <SelectItem value='success'>{dict.common.successful}</SelectItem>
              <SelectItem value='error'>{dict.common.failed}</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant='ghost' size='sm' onClick={clearFilters}>
              <TbX size={14} className='mr-1' />
              {dict.common.clearFilters}
            </Button>
          )}
        </div>

        {/* Refresh button */}
        <Button variant='ghost' size='sm' onClick={refresh}>
          <TbRefresh size={14} className='mr-1' />
          {dict.common.refresh}
        </Button>
      </div>

      {/* Log entries */}
      <div className='flex flex-col gap-3'>
        {loading ? (
          <>
            <ToolLogSkeletonRow />
            <ToolLogSkeletonRow />
            <ToolLogSkeletonRow />
            <ToolLogSkeletonRow />
            <ToolLogSkeletonRow />
          </>
        ) : logs.length === 0 ? (
          <div className={`py-12 text-center`}>
            <TbTool
              size={48}
              className={`
                mx-auto mb-4 text-gray-300
                dark:text-gray-700
              `}
            />
            <p
              className={`
                text-lg text-gray-600
                dark:text-gray-400
              `}
            >
              {dict.aiApplication.noActivityYet}
            </p>
            <p
              className={`
                text-sm text-gray-500
                dark:text-gray-500
              `}
            >
              {dict.aiApplication.noActivityDescription}
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <ToolLogEntry
              key={log.id}
              log={log}
              locale={locale}
              noInputsText={dict.aiApplication.noInputs}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalLogs > 0 && (
        <div
          className={`
            mt-6 flex flex-col items-center justify-between gap-4 border-t pt-4
            sm:flex-row
            dark:border-gray-800
          `}
        >
          <div className='flex items-center gap-2'>
            <span
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              {dict.common.showing} {(currentPage - 1) * limit + 1}-
              {Math.min(currentPage * limit, totalLogs)} {dict.common.of}{' '}
              {totalLogs}
            </span>
            <Select
              value={limit.toString()}
              onValueChange={(v) => setPageSize(parseInt(v, 10))}
            >
              <SelectTrigger className='w-20'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='25'>25</SelectItem>
                <SelectItem value='50'>50</SelectItem>
                <SelectItem value='100'>100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={prevPage}
              disabled={currentPage <= 1}
            >
              <TbChevronLeft size={16} />
              {dict.common.previous}
            </Button>
            <span
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              {dict.common.page} {currentPage} {dict.common.of} {totalPages}
            </span>
            <Button
              variant='ghost'
              size='sm'
              onClick={nextPage}
              disabled={currentPage >= totalPages}
            >
              {dict.common.next}
              <TbChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </ContentWrapper>
  );
};

export default AIApplicationActivitySection;
