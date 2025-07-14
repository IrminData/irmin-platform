'use client';

import { TbChevronDown, TbChevronRight } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';

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
  return (
    <>
      {fileGroups.map((group) => {
        const isExpanded = expandedFiles.has(group.filePath);
        const mappedFieldsCount = group.fields.filter((field) =>
          isFieldMapped(field, isSource, mappings)
        ).length;

        return (
          <div key={group.filePath} className='space-y-1'>
            {/* File Header */}
            <div
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onToggleFileExpansion(group.filePath);
                }
              }}
              onClick={() => onToggleFileExpansion(group.filePath)}
              className={`
                flex cursor-pointer items-center justify-between rounded-lg
                bg-muted/50 p-3 transition-colors
                hover:bg-input
              `}
            >
              <div className='flex items-center gap-2'>
                {isExpanded ? (
                  <TbChevronDown
                    className={`
                      size-4 text-gray-500
                      dark:text-gray-400
                    `}
                  />
                ) : (
                  <TbChevronRight
                    className={`
                      size-4 text-gray-500
                      dark:text-gray-400
                    `}
                  />
                )}
                {getFileIcon(group.fileType)}
                <div>
                  <div className='text-sm font-medium'>{group.filePath}</div>
                  <div
                    className={`
                      text-xs text-gray-500
                      dark:text-gray-400
                    `}
                  >
                    {group.fields.length} {dict.schemaFieldMapper.fields}
                    {mappedFieldsCount > 0 &&
                      ` • ${mappedFieldsCount} ${dict.schemaFieldMapper.mapped}`}
                    {group.size &&
                      ` • ${dict.schemaFieldMapper.fileSize.replace('{size}', (group.size / 1024).toFixed(1))}`}
                  </div>
                  {group.description && (
                    <div
                      className={`
                        mt-1 text-xs text-gray-400
                        dark:text-gray-500
                      `}
                    >
                      {group.description}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fields */}
            {isExpanded && (
              <div className='ml-6 space-y-1'>
                {group.fields.map((field) => {
                  const isMapped = isFieldMapped(field, isSource, mappings);
                  const isSelected = selectedSource?.path === field.path;
                  const canMap = !isSource && selectedSource && !isMapped;

                  return (
                    <div
                      key={field.path}
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (isSource) {
                            onSourceClick(field);
                          } else if (canMap) {
                            onDestinationClick(field);
                          }
                        }
                      }}
                      onClick={() => {
                        if (isSource) {
                          onSourceClick(field);
                        } else if (canMap) {
                          onDestinationClick(field);
                        }
                      }}
                      className={`
                        rounded-md border p-2 transition-all
                        ${
                          isSelected
                            ? `
                              cursor-pointer border-blue-500 bg-blue-50
                              dark:border-blue-400 dark:bg-blue-950/50
                            `
                            : isMapped
                              ? `
                                border-green-300 bg-green-50
                                dark:border-green-600 dark:bg-green-950/50
                              `
                              : canMap
                                ? `
                                  cursor-pointer border-blue-300 bg-blue-50
                                  hover:bg-blue-100
                                  dark:border-blue-600 dark:bg-blue-950/50
                                  dark:hover:bg-blue-950/70
                                `
                                : isSource
                                  ? `
                                    cursor-pointer border-gray-200
                                    hover:border-gray-300 hover:bg-gray-50
                                    dark:border-gray-700
                                    dark:hover:border-gray-600
                                    dark:hover:bg-gray-800/50
                                  `
                                  : selectedSource
                                    ? `
                                      cursor-not-allowed border-gray-200
                                      bg-gray-100 opacity-50
                                      dark:border-gray-700 dark:bg-gray-800/50
                                    `
                                    : `
                                      border-gray-200
                                      dark:border-gray-700
                                    `
                        }
                      `}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-medium'>
                            {field.name}
                          </span>
                          <Badge variant='primary'>
                            {field.type}
                            {field.format && `:${field.format}`}
                          </Badge>
                          {field.required && (
                            <Badge variant='destructive'>
                              {dict.schemaFieldMapper.required}
                            </Badge>
                          )}
                        </div>
                        {isMapped && (
                          <div
                            className={`
                              size-2 rounded-full bg-green-500
                              dark:bg-green-400
                            `}
                          />
                        )}
                      </div>
                      {field.description && (
                        <div
                          className={`
                            mt-1 text-xs text-gray-500
                            dark:text-gray-400
                          `}
                        >
                          {field.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default FieldGroup;
