'use client';

import { useCallback, useState } from 'react';

import { TbAlertTriangle, TbChevronDown, TbChevronUp } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

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
  const bgColor = isBreaking ? 'bg-red-500/5' : 'bg-yellow-500/5';
  const borderColor = isBreaking ? 'border-red-500/20' : 'border-yellow-500/20';

  return (
    <div className={cn('rounded-md border p-2', bgColor, borderColor)}>
      <div className='space-y-1'>
        <p className='font-mono text-xs font-medium'>{change.field_path}</p>
        {change.description && (
          <p className='text-xs text-muted-foreground'>{change.description}</p>
        )}
        <div className='flex flex-wrap gap-1 text-xs'>
          <span
            className={cn(
              'rounded px-1 py-0.5',
              change.change_type === 'added' &&
                'bg-green-500/20 text-green-600',
              change.change_type === 'removed' && 'bg-red-500/20 text-red-600',
              change.change_type === 'type_changed' &&
                'bg-yellow-500/20 text-yellow-600',
              change.change_type === 'required_changed' &&
                'bg-blue-500/20 text-blue-600',
              change.change_type === 'nullability_changed' &&
                'bg-cyan-500/20 text-cyan-600',
              change.change_type === 'modified' &&
                'bg-purple-500/20 text-purple-600'
            )}
          >
            {change.change_type.replace('_', ' ')}
          </span>
          {change.source_type && (
            <span
              className={`rounded bg-accent px-1 py-0.5 text-muted-foreground`}
            >
              From: {change.source_type}
            </span>
          )}
          {change.target_type && (
            <span
              className={`rounded bg-accent px-1 py-0.5 text-muted-foreground`}
            >
              To: {change.target_type}
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
        'rounded-lg border bg-card text-card-foreground',
        hasBreakingChanges ? 'border-red-500/30' : 'border-yellow-500/30'
      )}
    >
      {/* Header - using button for accessibility */}
      <button
        type='button'
        className={`
          flex w-full cursor-pointer items-center justify-between gap-2 p-3
          text-left
        `}
        onClick={toggleExpanded}
      >
        <div className='flex items-center gap-2'>
          {hasBreakingChanges && (
            <TbAlertTriangle className='size-4 text-red-500' />
          )}
          <span className='font-mono text-sm'>{schemaDiff.path}</span>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-xs',
              hasBreakingChanges
                ? 'bg-red-500/10 text-red-600'
                : 'bg-yellow-500/10 text-yellow-600'
            )}
          >
            {schemaDiff.diff.summary}
          </span>
        </div>
        <Button variant='ghost' size='sm' tabIndex={-1}>
          {isExpanded ? (
            <TbChevronUp className='size-4' />
          ) : (
            <TbChevronDown className='size-4' />
          )}
        </Button>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className='space-y-3 border-t p-3'>
          {/* Breaking Changes */}
          {hasBreakingChanges && (
            <div className='space-y-2'>
              <h5 className='text-xs font-medium text-red-600'>
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
              <h5 className='text-xs font-medium text-yellow-600'>
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
        </div>
      )}
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
            'rounded px-1.5 py-0.5 text-xs',
            hasAnyBreakingChanges
              ? 'bg-red-500/10 text-red-600'
              : 'bg-yellow-500/10 text-yellow-600'
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
