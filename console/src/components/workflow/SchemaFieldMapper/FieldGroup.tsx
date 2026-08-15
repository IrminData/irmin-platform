'use client';

import { useId } from 'react';

import { TbChevronDown, TbChevronRight } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import type { FieldMapping } from '@/types/core/Workflow';

import type { Field, FileGroup } from './types';
import { getFileIcon, isFieldMapped } from './utils';

interface FieldGroupProps {
  fileGroups: FileGroup[];
  isSource: boolean;
  expandedFiles: Set<string>;
  selectedSource: Field | null;
  mappings: FieldMapping[];
  onToggleFileExpansion: (filePath: string) => void;
  onSourceClick: (field: Field) => void;
  onDestinationClick: (field: Field) => void;
}

const FieldGroup = ({
  fileGroups,
  isSource,
  expandedFiles,
  selectedSource,
  mappings,
  onToggleFileExpansion,
  onSourceClick,
  onDestinationClick,
}: FieldGroupProps) => {
  const { dict } = useLocale();
  const fieldGroupId = useId();

  return (
    <>
      {fileGroups.map((group, groupIndex) => {
        const isExpanded = expandedFiles.has(group.filePath);
        const fieldsId = `${fieldGroupId}-fields-${groupIndex}`;
        const mappedFieldsCount = group.fields.filter((field) =>
          isFieldMapped(field, isSource, mappings)
        ).length;

        return (
          <div key={group.filePath} className='space-y-1'>
            {/* File Header */}
            <button
              type='button'
              aria-expanded={isExpanded}
              aria-controls={fieldsId}
              onClick={() => onToggleFileExpansion(group.filePath)}
              className={`
                flex w-full cursor-pointer appearance-none items-center
                justify-between rounded-[2px] bg-muted/50 p-3 text-left
                transition-colors
                hover:bg-input
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-accent
              `}
            >
              <span className='flex items-center gap-2'>
                {isExpanded ? (
                  <TbChevronDown
                    aria-hidden='true'
                    className='size-4 text-muted-foreground'
                  />
                ) : (
                  <TbChevronRight
                    aria-hidden='true'
                    className='size-4 text-muted-foreground'
                  />
                )}
                <span aria-hidden='true' className='inline-flex'>
                  {getFileIcon(group.fileType)}
                </span>
                <span>
                  <span className='block text-sm font-medium'>
                    {group.filePath}
                  </span>
                  <span className='block text-xs text-muted-foreground'>
                    {group.fields.length} {dict.schemaFieldMapper.fields}
                    {mappedFieldsCount > 0 &&
                      ` • ${mappedFieldsCount} ${dict.schemaFieldMapper.mapped}`}
                    {group.size &&
                      ` • ${dict.schemaFieldMapper.fileSize.replace('{size}', (group.size / 1024).toFixed(1))}`}
                  </span>
                  {group.description && (
                    <span className='mt-1 block text-xs text-muted-foreground/70'>
                      {group.description}
                    </span>
                  )}
                </span>
              </span>
            </button>

            {/* Fields */}
            <div id={fieldsId} hidden={!isExpanded} className='ml-6 space-y-1'>
              {isExpanded &&
                group.fields.map((field) => {
                  const isMapped = isFieldMapped(field, isSource, mappings);
                  const isSelected = selectedSource?.path === field.path;
                  const canMap = !isSource && selectedSource && !isMapped;
                  const canActivate = isSource || Boolean(canMap);
                  const fieldClassName = `
                    w-full appearance-none rounded-[2px] border p-2 text-left
                    transition-colors
                    ${
                      canActivate
                        ? `
                          focus-visible:outline-2 focus-visible:outline-accent
                          focus-visible:outline-offset-2
                        `
                        : ''
                    }
                    ${
                      isSelected
                        ? `
                          cursor-pointer border-chart-2 bg-chart-2/10
                        `
                        : isMapped
                          ? `
                            border-success/30 bg-success/10
                          `
                          : canMap
                            ? `
                              cursor-pointer border-chart-2/30 bg-chart-2/10
                              hover:bg-chart-2/20
                            `
                            : isSource
                              ? `
                                cursor-pointer border-border
                                hover:border-foreground/30 hover:bg-muted/50
                              `
                              : selectedSource
                                ? `
                                  cursor-not-allowed border-border bg-muted
                                  opacity-50
                                `
                                : `
                                  border-border
                                `
                    }
                  `;
                  const fieldContent = (
                    <>
                      <span className='flex items-center justify-between'>
                        <span className='flex items-center gap-2'>
                          <span className='text-sm font-medium'>
                            {field.name}
                          </span>
                          <span
                            className={`
                              inline-flex rounded-[2px] border border-border
                              bg-muted px-1.5 py-0.5 text-[11px] font-medium
                              text-foreground
                            `}
                          >
                            {field.type}
                            {field.format && `:${field.format}`}
                          </span>
                          {field.required && (
                            <span
                              className={`
                                inline-flex rounded-[2px] border
                                border-destructive/30 bg-destructive/15 px-1.5
                                py-0.5 text-[11px] font-medium text-foreground
                              `}
                            >
                              {dict.schemaFieldMapper.required}
                            </span>
                          )}
                        </span>
                        <span className='flex items-center gap-1'>
                          {field.truncated && (
                            <span
                              aria-label={
                                dict.schemaFieldMapper.nestedFieldsTruncated
                              }
                              className={`text-xs text-warning`}
                              title={
                                dict.schemaFieldMapper.nestedFieldsTruncated
                              }
                            >
                              ...
                            </span>
                          )}
                          {isMapped && (
                            <>
                              <span className='sr-only'>
                                {dict.schemaFieldMapper.mapped}
                              </span>
                              <span
                                aria-hidden='true'
                                className={`size-2 rounded-full bg-success`}
                              />
                            </>
                          )}
                        </span>
                      </span>
                      {field.description && (
                        <span
                          className={`mt-1 block text-xs text-muted-foreground`}
                        >
                          {field.description}
                        </span>
                      )}
                    </>
                  );

                  if (!canActivate) {
                    return (
                      <div key={field.path} className={fieldClassName}>
                        {fieldContent}
                      </div>
                    );
                  }

                  return (
                    <button
                      type='button'
                      key={field.path}
                      aria-pressed={isSource ? isSelected : undefined}
                      onClick={() => {
                        if (isSource) {
                          onSourceClick(field);
                        } else if (canMap) {
                          onDestinationClick(field);
                        }
                      }}
                      className={fieldClassName}
                    >
                      {fieldContent}
                    </button>
                  );
                })}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default FieldGroup;
