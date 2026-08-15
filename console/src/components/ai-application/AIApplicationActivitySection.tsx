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
        flex animate-pulse items-center gap-4 rounded-[2px] bg-card/80 p-3
      `}
    >
      <div className={`size-8 rounded-[2px] bg-muted`} />
      <div className='flex-1'>
        <div className={`mb-2 h-4 w-1/3 rounded-[2px] bg-muted`} />
        <div className={`h-3 w-2/3 rounded-[2px] bg-muted`} />
      </div>
      <div className='flex flex-col gap-1'>
        <div className={`h-3 w-20 rounded-[2px] bg-muted`} />
        <div className={`h-3 w-16 rounded-[2px] bg-muted`} />
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
          flex flex-col gap-3 rounded-[2px] bg-card/80 p-3 transition-colors
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
            ? `border border-success/30 bg-success/10 text-success`
            : `border border-destructive/30 bg-destructive/10 text-destructive`
        )}
      >
        {log.success ? <TbCheck size={16} /> : <TbX size={16} />}
      </div>

      {/* Main content */}
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className={`font-medium text-foreground`}>{log.tool_name}</span>
          <span
            className={`
              rounded-full border border-border bg-muted px-2 py-0.5 text-xs
              text-muted-foreground
            `}
          >
            {log.tool_type || 'built-in'}
          </span>
          <span
            className={`
              rounded-full border border-chart-2/30 bg-chart-2/10 px-2 py-0.5
              text-xs text-foreground uppercase
            `}
          >
            {log.protocol}
          </span>
        </div>
        <p className={`mt-1 truncate text-sm text-muted-foreground`}>
          {inputsPreview}
        </p>
        {!log.success && log.error_msg && (
          <p className={`mt-1 truncate text-sm text-destructive`}>
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
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <TbClock size={12} />
          <span>{log.duration_ms}ms</span>
        </div>
        <span className={`text-xs text-muted-foreground`}>
          {new Date(log.created_at).toLocaleString(locale)}
        </span>
        {log.request_ip && (
          <span className={`text-xs text-muted-foreground`}>
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
        `flex items-center gap-3 rounded-[2px] border bg-card/50 p-3`,
        variant === 'success' && `border-success/30`,
        variant === 'error' && `border-destructive/30`
      )}
    >
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-full',
          variant === 'default' && `bg-muted`,
          variant === 'success' && `bg-success/10 text-success`,
          variant === 'error' && `bg-destructive/10 text-destructive`
        )}
      >
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-semibold text-foreground`}>{value}</p>
        <p className={`text-sm text-muted-foreground`}>{label}</p>
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
      titleKey='activityTitle'
      descriptionKey='activityDescription'
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
          title={dict.common.errors.failedToLoadActivity}
          description={dict.common.errors.failedToLoadAgain}
          onRetry={refresh}
        />
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper className='mt-4'>
      {/* Header with title and description */}
      <div className='mb-6'>
        <h2 className={`text-lg font-semibold text-foreground`}>
          {dict.aiApplication.activity}
        </h2>
        <p className={`text-sm text-muted-foreground`}>
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
              <SelectValue placeholder={dict.common.all} />
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
              <SelectValue placeholder={dict.common.all} />
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
              className={`mx-auto mb-4 text-muted-foreground/50`}
            />
            <p className={`text-lg text-muted-foreground`}>
              {dict.aiApplication.noActivityYet}
            </p>
            <p className={`text-sm text-muted-foreground`}>
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
            mt-6 flex flex-col items-center justify-between gap-4 border-t
            border-border pt-4
            sm:flex-row
          `}
        >
          <div className='flex items-center gap-2'>
            <span className={`text-sm text-muted-foreground`}>
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
            <span className={`text-sm text-muted-foreground`}>
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
