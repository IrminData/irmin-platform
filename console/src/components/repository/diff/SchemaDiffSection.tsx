'use client';

import { useCallback, useId, useState } from 'react';

import { TbAlertTriangle, TbChevronDown, TbChevronUp } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

import type {
  ObjectSchemaDiff,
  SchemaFieldDiff,
} from '@/types/core/SchemaValidation';

/**
 * Displays schema changes for a specific object.
 */
function SchemaFieldDiffItem({
  change,
  isBreaking,
}: {
  change: SchemaFieldDiff;
  isBreaking: boolean;
}) {
  const { dict } = useLocale();
  const bgColor = isBreaking ? 'bg-destructive/5' : 'bg-warning/5';
  const borderColor = isBreaking
    ? 'border-destructive/20'
    : 'border-warning/20';

  return (
    <div className={cn('rounded-[2px] border p-2', bgColor, borderColor)}>
      <div className='space-y-1'>
        <p className='font-mono text-xs font-medium'>{change.field_path}</p>
        {change.description && (
          <p className='text-xs text-muted-foreground'>{change.description}</p>
        )}
        <div className='flex flex-wrap gap-1 text-xs'>
          <span
            className={cn(
              'rounded-[2px] border px-1 py-0.5 text-foreground',
              change.change_type === 'added' &&
                'border-success/30 bg-success/10',
              change.change_type === 'removed' &&
                'border-destructive/30 bg-destructive/10',
              change.change_type === 'type_changed' &&
                'border-warning/30 bg-warning/10',
              change.change_type === 'required_changed' &&
                'border-chart-2/30 bg-chart-2/10',
              change.change_type === 'nullability_changed' &&
                'border-chart-3/30 bg-chart-3/10',
              change.change_type === 'modified' &&
                'border-chart-4/30 bg-chart-4/10'
            )}
          >
            {change.change_type.replace('_', ' ')}
          </span>
          {change.source_type && (
            <span
              className={`
                rounded-[2px] border border-border bg-muted px-1 py-0.5
                text-foreground
              `}
            >
              {dict.common.from}: {change.source_type}
            </span>
          )}
          {change.target_type && (
            <span
              className={`
                rounded-[2px] border border-border bg-muted px-1 py-0.5
                text-foreground
              `}
            >
              {dict.common.to}: {change.target_type}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Displays a single object's schema diff.
 */
function ObjectSchemaDiffCard({
  schemaDiff,
}: {
  schemaDiff: ObjectSchemaDiff;
}) {
  const { dict } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();

  const hasBreakingChanges =
    schemaDiff.diff.breaking_changes &&
    schemaDiff.diff.breaking_changes.length > 0;
  const hasNonBreakingChanges =
    schemaDiff.diff.non_breaking_changes &&
    schemaDiff.diff.non_breaking_changes.length > 0;

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(
        'rounded-[2px] border bg-card text-card-foreground',
        hasBreakingChanges ? 'border-destructive/30' : 'border-warning/30'
      )}
    >
      {/* Header - using button for accessibility */}
      <button
        type='button'
        className={`
          flex w-full cursor-pointer items-center justify-between gap-2 p-3
          text-left
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-accent
        `}
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className='flex items-center gap-2'>
          {hasBreakingChanges && (
            <TbAlertTriangle
              aria-hidden='true'
              className='size-4 text-destructive'
            />
          )}
          <span className='font-mono text-sm'>{schemaDiff.path}</span>
          <span
            className={cn(
              'rounded-[2px] border px-1.5 py-0.5 text-xs text-foreground',
              hasBreakingChanges
                ? 'border-destructive/30 bg-destructive/10'
                : 'border-warning/30 bg-warning/10'
            )}
          >
            {schemaDiff.diff.summary}
          </span>
        </div>
        <span
          aria-hidden='true'
          className='inline-flex size-9 items-center justify-center'
        >
          {isExpanded ? (
            <TbChevronUp className='size-4' />
          ) : (
            <TbChevronDown className='size-4' />
          )}
        </span>
      </button>

      {/* Expanded Content */}
      <div
        id={contentId}
        hidden={!isExpanded}
        className='space-y-3 border-t p-3'
      >
        {isExpanded && (
          <>
            {/* Breaking Changes */}
            {hasBreakingChanges && (
              <div className='space-y-2'>
                <h5 className='text-xs font-medium text-destructive'>
                  {dict.repository.compare.breakingChanges} (
                  {schemaDiff.diff.breaking_changes?.length})
                </h5>
                <div className='space-y-1'>
                  {schemaDiff.diff.breaking_changes?.map((change) => (
                    <SchemaFieldDiffItem
                      key={`breaking-${schemaDiff.path}-${change.field_path}-${change.change_type}`}
                      change={change}
                      isBreaking
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Non-Breaking Changes */}
            {hasNonBreakingChanges && (
              <div className='space-y-2'>
                <h5 className='text-xs font-medium text-warning'>
                  {dict.repository.compare.nonBreakingChanges} (
                  {schemaDiff.diff.non_breaking_changes?.length})
                </h5>
                <div className='space-y-1'>
                  {schemaDiff.diff.non_breaking_changes?.map((change) => (
                    <SchemaFieldDiffItem
                      key={`non-breaking-${schemaDiff.path}-${change.field_path}-${change.change_type}`}
                      change={change}
                      isBreaking={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Section to display all schema diffs in a repository comparison.
 */
export default function SchemaDiffSection({
  schemaDiffs,
}: {
  schemaDiffs: ObjectSchemaDiff[];
}) {
  const { dict } = useLocale();

  if (!schemaDiffs || schemaDiffs.length === 0) {
    return null;
  }

  const hasAnyBreakingChanges = schemaDiffs.some(
    (sd) => sd.diff.breaking_changes && sd.diff.breaking_changes.length > 0
  );

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        <h4 className='text-sm font-medium'>
          {dict.repository.compare.schemaChanges}
        </h4>
        <span
          className={cn(
            'rounded-[2px] border px-1.5 py-0.5 text-xs text-foreground',
            hasAnyBreakingChanges
              ? 'border-destructive/30 bg-destructive/10'
              : 'border-warning/30 bg-warning/10'
          )}
        >
          {schemaDiffs.length}{' '}
          {schemaDiffs.length === 1
            ? dict.repository.compare.file
            : dict.repository.compare.files}
        </span>
      </div>
      <div className='space-y-2'>
        {schemaDiffs.map((schemaDiff) => (
          <ObjectSchemaDiffCard
            key={`schema-diff-${schemaDiff.path}`}
            schemaDiff={schemaDiff}
          />
        ))}
      </div>
    </div>
  );
}
