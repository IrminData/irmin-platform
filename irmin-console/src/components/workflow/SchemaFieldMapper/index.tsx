'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  TbArrowRight,
  TbArrowsExchange,
  TbEdit,
  TbFilter,
  TbPlus,
  TbX,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { FieldMapping } from '@/types/core/Workflow';

import FieldGroup from './FieldGroup';
import type { Field, ManualField, SchemaFieldMapperMode } from './types';
import { autoMapIdenticalFields, groupFieldsByFile, hasFields } from './utils';

const EMPTY_MAPPINGS: FieldMapping[] = [];

/** Allowed DuckDB type cast options */
const CAST_TYPE_OPTIONS = [
  '',
  'VARCHAR',
  'INTEGER',
  'BIGINT',
  'DOUBLE',
  'BOOLEAN',
  'TIMESTAMP',
  'DATE',
] as const;

const SchemaFieldMapper = ({
  initialMappings = EMPTY_MAPPINGS,
  onMappingsChange,
  sourceSchema,
  destinationSchema,
  showEmptyState = false,
  mode = 'import_export',
  readOnly = false,
}: {
  initialMappings?: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  sourceSchema: ObjectSchema | null;
  destinationSchema: ObjectSchema | null;
  showEmptyState?: boolean;
  /** Component mode: 'import_export' requires both schemas, 'standalone' allows free-form usage */
  mode?: SchemaFieldMapperMode;
  /** When true, all interactions are disabled and no changes propagate */
  readOnly?: boolean;
}) => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const [mappings, setMappings] = useState<FieldMapping[]>(
    initialMappings ?? []
  );

  const [selectedSource, setSelectedSource] = useState<Field | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [hasManualMappings, setHasManualMappings] = useState(
    // If initialMappings were provided, treat them as manual to avoid auto-map overwrite
    initialMappings.length > 0
  );
  const [editingMappingIdx, setEditingMappingIdx] = useState<number | null>(
    null
  );
  /** Local value for the inline destination field rename input (committed on blur/Enter) */
  const [editingRenameValue, setEditingRenameValue] = useState('');
  /** When true, the next onBlur should NOT save (Escape was pressed) */
  const renameCancelledRef = useRef(false);
  const [jsonPathInput, setJsonPathInput] = useState('');

  // Standalone mode: manual field entry
  // Initialize from initialMappings so saved stages restore their field panels
  const [manualSourceFields, setManualSourceFields] = useState<ManualField[]>(
    () => {
      if (mode !== 'standalone' || initialMappings.length === 0) return [];
      const seen = new Set<string>();
      return initialMappings
        .filter((m) => {
          const key = `${m.source_path}:${m.source_field}`;
          if (!m.source_field || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((m) => ({ name: m.source_field!, filePath: m.source_path }));
    }
  );
  const [manualDestFields, setManualDestFields] = useState<ManualField[]>(
    () => {
      if (mode !== 'standalone' || initialMappings.length === 0) return [];
      const seen = new Set<string>();
      return initialMappings
        .filter((m) => {
          const key = `${m.destination_path}:${m.destination_field}`;
          if (!m.destination_field || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((m) => ({
          name: m.destination_field!,
          filePath: m.destination_path,
        }));
    }
  );
  const [newSourceFieldName, setNewSourceFieldName] = useState('');
  const [newDestFieldName, setNewDestFieldName] = useState('');

  // Handle mappings change
  const previousMappings = useRef<FieldMapping[]>([]);
  const handleMappingsChange = useCallback(
    (newMappings: FieldMapping[]) => {
      if (readOnly) return;
      setMappings(newMappings);
      if (
        JSON.stringify(newMappings) !== JSON.stringify(previousMappings.current)
      ) {
        onMappingsChange(newMappings);
        previousMappings.current = newMappings;
      }
    },
    [onMappingsChange, readOnly]
  );

  // Auto-expand all files initially
  useEffect(() => {
    const allFiles = new Set<string>();
    if (sourceSchema?.type === 'group') {
      sourceSchema?.children?.forEach((child) => allFiles.add(child.path));
    }
    if (destinationSchema?.type === 'group') {
      destinationSchema?.children?.forEach((child) => allFiles.add(child.path));
    }
    queueMicrotask(() => {
      setExpandedFiles(allFiles);
    });
  }, [sourceSchema, destinationSchema]);

  // Reset auto-map tracking when schemas change substantially
  const autoMappedRef = useRef(false);
  const prevSchemasRef = useRef({
    source: sourceSchema,
    dest: destinationSchema,
  });
  useEffect(() => {
    if (
      prevSchemasRef.current.source !== sourceSchema ||
      prevSchemasRef.current.dest !== destinationSchema
    ) {
      prevSchemasRef.current = {
        source: sourceSchema,
        dest: destinationSchema,
      };
      autoMappedRef.current = false;
    }
  }, [sourceSchema, destinationSchema]);

  // Auto-map identical fields on schema changes, but only if user hasn't made manual mappings
  useEffect(() => {
    if (
      sourceSchema &&
      destinationSchema &&
      !hasManualMappings &&
      !autoMappedRef.current
    ) {
      const result = autoMapIdenticalFields(
        sourceSchema,
        destinationSchema,
        []
      );
      if (result && result.autoMappedCount > 0) {
        autoMappedRef.current = true;
        queueMicrotask(() => {
          handleMappingsChange(result.newMappings);
        });
      }
    }
  }, [
    sourceSchema,
    destinationSchema,
    hasManualMappings,
    handleMappingsChange,
  ]);

  const toggleFileExpansion = useCallback((filePath: string) => {
    setExpandedFiles((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(filePath)) {
        newExpanded.delete(filePath);
      } else {
        newExpanded.add(filePath);
      }
      return newExpanded;
    });
  }, []);

  const handleSourceClick = useCallback((field: Field) => {
    // Toggle: clicking the already-selected source deselects it
    setSelectedSource((prev) =>
      prev?.name === field.name && prev?.path === field.path ? null : field
    );
  }, []);

  const handleDestinationClick = useCallback(
    (field: Field) => {
      if (!selectedSource) return;

      const filteredMappings = mappings.filter(
        (m) => m.destination_path !== field.path
      );
      const newMapping: FieldMapping = {
        source_field: selectedSource.name,
        source_path: selectedSource.path,
        destination_field: field.name,
        destination_path: field.path,
        // Apply JSON path if set
        ...(jsonPathInput ? { source_json_path: jsonPathInput } : {}),
      };

      handleMappingsChange([...filteredMappings, newMapping]);
      setSelectedSource(null);
      setHasManualMappings(true);
      // Clear JSON path so it doesn't leak into subsequent mappings
      setJsonPathInput('');
    },
    [selectedSource, mappings, handleMappingsChange, jsonPathInput]
  );

  const removeMapping = useCallback(
    (destinationPath: string, destinationField: string | undefined) => {
      handleMappingsChange(
        mappings.filter(
          (m) =>
            !(
              m.destination_path === destinationPath &&
              m.destination_field === destinationField
            )
        )
      );
    },
    [mappings, handleMappingsChange]
  );

  /** Update destination field name (rename) for a specific mapping */
  const updateMappingDestinationField = useCallback(
    (index: number, newName: string) => {
      const trimmed = newName.trim();
      // Prevent empty destination field names
      if (!trimmed) return;
      // Prevent duplicate destination field names within the same destination file
      const mapping = mappings[index];
      const destPath = mapping?.destination_path;
      const hasDuplicate = mappings.some(
        (m, i) =>
          i !== index &&
          m.destination_path === destPath &&
          m.destination_field === trimmed
      );
      if (hasDuplicate) return;
      const updated = [...mappings];
      updated[index] = { ...updated[index], destination_field: trimmed };
      handleMappingsChange(updated);

      // In standalone mode, keep manualDestFields in sync so the panel's
      // isMapped check and removeManualDestField cleanup use the correct name.
      if (mode === 'standalone' && mapping) {
        const oldName = mapping.destination_field;
        setManualDestFields((prev) =>
          prev.map((f) =>
            f.filePath === destPath && f.name === oldName
              ? { ...f, name: trimmed }
              : f
          )
        );
      }
    },
    [mappings, handleMappingsChange, mode]
  );

  /** Update source_json_path for a specific mapping */
  const updateMappingJsonPath = useCallback(
    (index: number, jsonPath: string) => {
      const updated = [...mappings];
      updated[index] = {
        ...updated[index],
        source_json_path: jsonPath || undefined,
      };
      handleMappingsChange(updated);
    },
    [mappings, handleMappingsChange]
  );

  /** Update cast type for a specific mapping */
  const updateMappingCastType = useCallback(
    (index: number, castType: string) => {
      const updated = [...mappings];
      updated[index] = {
        ...updated[index],
        cast_type: castType || undefined,
      };
      handleMappingsChange(updated);
    },
    [mappings, handleMappingsChange]
  );

  // --- Standalone mode: manual field helpers ---

  const addManualSourceField = useCallback(() => {
    const name = newSourceFieldName.trim();
    if (!name) return;
    // Prevent duplicate field names
    if (manualSourceFields.some((f) => f.name === name)) return;
    setManualSourceFields((prev) => [...prev, { name, filePath: 'source' }]);
    setNewSourceFieldName('');
  }, [newSourceFieldName, manualSourceFields]);

  const removeManualSourceField = useCallback(
    (index: number) => {
      const removed = manualSourceFields[index];
      if (removed) {
        // Clean up any mappings referencing this source field
        handleMappingsChange(
          mappings.filter(
            (m) =>
              !(
                m.source_field === removed.name &&
                m.source_path === removed.filePath
              )
          )
        );
        // Clear selection if the removed field was selected
        if (
          selectedSource?.name === removed.name &&
          selectedSource?.path === removed.filePath
        ) {
          setSelectedSource(null);
        }
      }
      setManualSourceFields((prev) => prev.filter((_, i) => i !== index));
    },
    [manualSourceFields, mappings, handleMappingsChange, selectedSource]
  );

  const addManualDestField = useCallback(() => {
    const name = newDestFieldName.trim();
    if (!name) return;
    // Prevent duplicate field names
    if (manualDestFields.some((f) => f.name === name)) return;
    setManualDestFields((prev) => [...prev, { name, filePath: 'destination' }]);
    setNewDestFieldName('');
  }, [newDestFieldName, manualDestFields]);

  const removeManualDestField = useCallback(
    (index: number) => {
      const removed = manualDestFields[index];
      if (removed) {
        // Clean up any mappings referencing this destination field
        handleMappingsChange(
          mappings.filter(
            (m) =>
              !(
                m.destination_field === removed.name &&
                m.destination_path === removed.filePath
              )
          )
        );
      }
      setManualDestFields((prev) => prev.filter((_, i) => i !== index));
    },
    [manualDestFields, mappings, handleMappingsChange]
  );

  /** In standalone mode, clicking a manual source field selects it for mapping */
  const handleManualSourceClick = useCallback((field: ManualField) => {
    // Toggle: clicking the already-selected source deselects it
    setSelectedSource((prev) =>
      prev?.name === field.name && prev?.path === field.filePath
        ? null
        : {
            path: field.filePath,
            name: field.name,
            type: 'string',
            source: field.filePath,
          }
    );
  }, []);

  /** In standalone mode, clicking a manual dest field creates the mapping */
  const handleManualDestClick = useCallback(
    (field: ManualField) => {
      if (!selectedSource) return;

      const filteredMappings = mappings.filter(
        (m) =>
          !(
            m.destination_path === field.filePath &&
            m.destination_field === field.name
          )
      );
      const newMapping: FieldMapping = {
        source_field: selectedSource.name,
        source_path: selectedSource.path,
        destination_field: field.name,
        destination_path: field.filePath,
        ...(jsonPathInput ? { source_json_path: jsonPathInput } : {}),
      };

      handleMappingsChange([...filteredMappings, newMapping]);
      setSelectedSource(null);
      setHasManualMappings(true);
      setJsonPathInput('');
    },
    [selectedSource, mappings, handleMappingsChange, jsonPathInput]
  );

  const sourceFileGroups = useMemo(
    () => groupFieldsByFile(sourceSchema),
    [sourceSchema]
  );
  const destinationFileGroups = useMemo(
    () => groupFieldsByFile(destinationSchema),
    [destinationSchema]
  );

  const handleAutoMapIdenticalFields = useCallback(() => {
    const result = autoMapIdenticalFields(
      sourceSchema,
      destinationSchema,
      mappings
    );
    if (!result) return;

    handleMappingsChange(result.newMappings);
    setHasManualMappings(true);

    if (result.autoMappedCount > 0) {
      irminAlert(
        'success',
        dict.schemaFieldMapper.autoMappedSuccess.replace(
          '{count}',
          result.autoMappedCount.toString()
        )
      );
    } else {
      irminAlert('info', dict.schemaFieldMapper.noIdenticalFieldsFound);
    }
  }, [
    sourceSchema,
    destinationSchema,
    mappings,
    dict.schemaFieldMapper,
    irminAlert,
    handleMappingsChange,
  ]);

  const handleClearAllMappings = useCallback(() => {
    handleMappingsChange([]);
    setHasManualMappings(false);
    autoMappedRef.current = false;
  }, [handleMappingsChange]);

  const description = useMemo(() => {
    if (mode === 'standalone') {
      return dict.schemaFieldMapper.fieldMappingStageDescription;
    }
    if (selectedSource) {
      return dict.schemaFieldMapper.descriptionWithSelection
        .replace('{fieldName}', selectedSource.name)
        .replace('{source}', selectedSource.source);
    }
    return dict.schemaFieldMapper.description;
  }, [
    mode,
    selectedSource,
    dict.schemaFieldMapper.descriptionWithSelection,
    dict.schemaFieldMapper.description,
    dict.schemaFieldMapper.fieldMappingStageDescription,
  ]);

  const mappingsCount = mappings.length;
  const mappingsContainerRef = useRef<HTMLDivElement>(null);
  const prevMappingsCountRef = useRef(mappingsCount);

  // Scroll mappings list to bottom when a new mapping is added
  useEffect(() => {
    if (mappingsCount > prevMappingsCountRef.current) {
      mappingsContainerRef.current?.scrollTo({
        top: mappingsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevMappingsCountRef.current = mappingsCount;
  }, [mappingsCount]);

  const hasMappings = mappings.length > 0;

  const sourceHasFields = useMemo(
    () => hasFields(sourceSchema),
    [sourceSchema]
  );
  const destinationHasFields = useMemo(
    () => hasFields(destinationSchema),
    [destinationSchema]
  );

  // In import_export mode, hide if schemas lack fields
  // In standalone mode, always show the mapper
  if (mode === 'import_export' && (!sourceHasFields || !destinationHasFields)) {
    if (!showEmptyState) {
      return null;
    }

    return (
      <div className='mx-auto w-full max-w-7xl space-y-4 py-4'>
        <div
          className={`
            rounded-lg border border-gray-200 p-8 text-center
            dark:border-gray-700
          `}
        >
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.schemaFieldMapper.noFieldsToMap}
          </p>
        </div>
      </div>
    );
  }

  // Check whether we're in standalone mode with no schemas (manual field entry mode)
  const isManualEntryMode =
    mode === 'standalone' &&
    sourceFileGroups.length === 0 &&
    destinationFileGroups.length === 0;

  return (
    <div className='mx-auto w-full max-w-7xl space-y-4 py-4'>
      {/* Description Section */}
      <p className='text-center text-sm/relaxed text-foreground/80'>
        {description}
      </p>

      {/* JSON Path input for unwrapping (standalone mode, above panels) */}
      {mode === 'standalone' && (
        <div
          className={`
            flex items-center gap-2 rounded-lg border border-border
            bg-background px-4 py-2
          `}
        >
          <TbFilter className='size-4 shrink-0 text-muted-foreground' />
          <Input
            type='text'
            placeholder={dict.schemaFieldMapper.jsonPathPlaceholder}
            value={jsonPathInput}
            onChange={(e) => setJsonPathInput(e.target.value)}
            readOnly={readOnly}
            className='h-7 text-xs'
          />
        </div>
      )}

      <div
        className={`
          grid grid-cols-1 gap-8
          lg:grid-cols-2
        `}
      >
        {/* Source Fields */}
        <div
          className={`
            overflow-hidden rounded-xl border border-border bg-background
          `}
        >
          <div
            className={`
              border-b border-border bg-linear-to-r from-card px-4 py-2
            `}
          >
            <h3 className='text-lg font-medium text-foreground'>
              {dict.schemaFieldMapper.sourceSchema}
            </h3>
          </div>
          <div className='max-h-[700px] space-y-3 overflow-y-auto p-2'>
            {isManualEntryMode ? (
              <div className='space-y-2 p-2'>
                {manualSourceFields.map((field, i) => {
                  const isSelected =
                    selectedSource?.name === field.name &&
                    selectedSource?.path === field.filePath;
                  const isMapped = mappings.some(
                    (m) =>
                      m.source_field === field.name &&
                      m.source_path === field.filePath
                  );
                  return (
                    <div
                      key={`src-${field.name}-${i}`}
                      className={`
                        flex cursor-pointer items-center justify-between
                        rounded-md border px-3 py-2 text-sm transition-colors
                        ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : isMapped
                              ? 'border-irmin-green-300 bg-irmin-green-100'
                              : `
                                border-border
                                hover:bg-muted/50
                              `
                        }
                      `}
                    >
                      <button
                        type='button'
                        className='flex-1 text-left font-medium'
                        onClick={() => handleManualSourceClick(field)}
                        disabled={readOnly}
                      >
                        {field.name}
                      </button>
                      {!readOnly && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='size-6 p-0'
                          onClick={() => removeManualSourceField(i)}
                        >
                          <TbX className='size-3' />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {!readOnly && (
                  <div className='flex items-center gap-2 pt-1'>
                    <Input
                      type='text'
                      placeholder={dict.schemaFieldMapper.addFieldPlaceholder}
                      value={newSourceFieldName}
                      onChange={(e) => setNewSourceFieldName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addManualSourceField();
                      }}
                      className='h-8 text-xs'
                    />
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={addManualSourceField}
                      disabled={!newSourceFieldName.trim()}
                      className='h-8 shrink-0'
                    >
                      <TbPlus className='size-4' />
                    </Button>
                  </div>
                )}
              </div>
            ) : sourceFileGroups.length === 0 ? (
              <div
                className={`
                  flex flex-col items-center justify-center py-12 text-center
                `}
              >
                <div className='mb-4 rounded-full bg-muted p-3'>
                  <TbArrowRight className='size-6 text-muted-foreground' />
                </div>
                <p className='text-sm text-muted-foreground'>
                  {dict.schemaFieldMapper.sourceEmpty}
                </p>
              </div>
            ) : (
              <FieldGroup
                fileGroups={sourceFileGroups}
                isSource={true}
                expandedFiles={expandedFiles}
                selectedSource={selectedSource}
                mappings={mappings}
                onToggleFileExpansion={toggleFileExpansion}
                onSourceClick={handleSourceClick}
                onDestinationClick={handleDestinationClick}
              />
            )}
          </div>
        </div>

        {/* Destination Fields */}
        <div
          className={`
            overflow-hidden rounded-xl border border-border bg-background
          `}
        >
          <div
            className={`
              border-b border-border bg-linear-to-r from-card px-4 py-2
            `}
          >
            <h3 className='text-lg font-medium text-foreground'>
              {dict.schemaFieldMapper.destinationSchema}
            </h3>
          </div>
          <div className='max-h-[700px] space-y-3 overflow-y-auto p-2'>
            {isManualEntryMode ? (
              <div className='space-y-2 p-2'>
                {manualDestFields.map((field, i) => {
                  const isMapped = mappings.some(
                    (m) =>
                      m.destination_field === field.name &&
                      m.destination_path === field.filePath
                  );
                  return (
                    <div
                      key={`dst-${field.name}-${i}`}
                      className={`
                        flex cursor-pointer items-center justify-between
                        rounded-md border px-3 py-2 text-sm transition-colors
                        ${
                          isMapped
                            ? 'border-irmin-green-300 bg-irmin-green-100'
                            : selectedSource
                              ? `
                                border-primary/50
                                hover:border-primary hover:bg-primary/10
                              `
                              : `
                                border-border
                                hover:bg-muted/50
                              `
                        }
                      `}
                    >
                      <button
                        type='button'
                        className='flex-1 text-left font-medium'
                        onClick={() => handleManualDestClick(field)}
                        disabled={readOnly || !selectedSource}
                      >
                        {field.name}
                      </button>
                      {!readOnly && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='size-6 p-0'
                          onClick={() => removeManualDestField(i)}
                        >
                          <TbX className='size-3' />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {!readOnly && (
                  <div className='flex items-center gap-2 pt-1'>
                    <Input
                      type='text'
                      placeholder={dict.schemaFieldMapper.addFieldPlaceholder}
                      value={newDestFieldName}
                      onChange={(e) => setNewDestFieldName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addManualDestField();
                      }}
                      className='h-8 text-xs'
                    />
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={addManualDestField}
                      disabled={!newDestFieldName.trim()}
                      className='h-8 shrink-0'
                    >
                      <TbPlus className='size-4' />
                    </Button>
                  </div>
                )}
              </div>
            ) : destinationFileGroups.length === 0 ? (
              <div
                className={`
                  flex flex-col items-center justify-center py-12 text-center
                `}
              >
                <div className='mb-4 rounded-full bg-muted p-3'>
                  <TbArrowRight className='size-6 text-muted-foreground' />
                </div>
                <p className='text-sm text-muted-foreground'>
                  {dict.schemaFieldMapper.destinationEmpty}
                </p>
              </div>
            ) : (
              <FieldGroup
                fileGroups={destinationFileGroups}
                isSource={false}
                expandedFiles={expandedFiles}
                selectedSource={selectedSource}
                mappings={mappings}
                onToggleFileExpansion={toggleFileExpansion}
                onSourceClick={handleSourceClick}
                onDestinationClick={handleDestinationClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mappings */}
      <div
        className={`
          overflow-hidden rounded-xl border border-border bg-background
        `}
      >
        <div
          className={`border-b border-border bg-linear-to-r from-card px-4 py-2`}
        >
          <h3 className='text-lg font-medium text-foreground'>
            {dict.schemaFieldMapper.fieldMappings}
            <span
              className={`
                ml-2 inline-flex items-center justify-center rounded-full
                bg-primary px-2.5 py-0.5 text-sm font-medium
                text-primary-foreground
              `}
            >
              {mappingsCount}
            </span>
          </h3>
        </div>
        <div
          ref={mappingsContainerRef}
          className='max-h-96 space-y-3 overflow-y-auto p-4'
        >
          {!hasMappings ? (
            <div
              className={`
                flex flex-col items-center justify-center py-12 text-center
              `}
            >
              <div className='mb-4 rounded-full bg-muted p-3'>
                <TbArrowRight className='size-6 text-muted-foreground' />
              </div>
              <p className='text-sm text-muted-foreground'>
                {dict.schemaFieldMapper.noMappingsYet}
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {mappings.map((mapping, idx) => {
                const isRenamed =
                  mapping.source_field !== mapping.destination_field;
                const isEditing = editingMappingIdx === idx;

                return (
                  <div
                    key={`${mapping.destination_path}-${mapping.destination_field ?? idx}`}
                    className={`
                      group relative rounded-lg border border-border
                      bg-linear-to-r from-card to-background p-4 transition-all
                      duration-200
                    `}
                  >
                    {!readOnly && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() =>
                          removeMapping(
                            mapping.destination_path,
                            mapping.destination_field
                          )
                        }
                        className={`
                          absolute top-2 right-2 size-6 p-0 opacity-0
                          transition-opacity duration-200
                          group-hover:opacity-100
                          hover:bg-destructive/10 hover:text-destructive
                        `}
                      >
                        <TbX className='size-3' />
                      </Button>
                    )}
                    <div className='space-y-3 pr-8'>
                      <div className='space-y-1 text-xs'>
                        <div className='font-medium text-muted-foreground'>
                          {mapping.source_path}
                        </div>
                        <div className='font-medium text-muted-foreground'>
                          {mapping.destination_path}
                        </div>
                      </div>
                      <div className='flex items-center gap-3 text-sm'>
                        <span
                          className={`
                            rounded-sm bg-irmin-blue-100 px-2 py-1 font-medium
                            text-irmin-blue-700
                          `}
                        >
                          {mapping.source_field || '—'}
                        </span>
                        <TbArrowRight className='size-4 text-primary' />
                        {!readOnly && isEditing ? (
                          <Input
                            type='text'
                            value={editingRenameValue}
                            onChange={(e) =>
                              setEditingRenameValue(e.target.value)
                            }
                            onBlur={() => {
                              if (!renameCancelledRef.current) {
                                updateMappingDestinationField(
                                  idx,
                                  editingRenameValue
                                );
                              }
                              renameCancelledRef.current = false;
                              setEditingMappingIdx(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateMappingDestinationField(
                                  idx,
                                  editingRenameValue
                                );
                                setEditingMappingIdx(null);
                              } else if (e.key === 'Escape') {
                                renameCancelledRef.current = true;
                                setEditingMappingIdx(null);
                              }
                            }}
                            ref={(el) => el?.focus()}
                            className='h-7 w-40 text-xs'
                          />
                        ) : (
                          <button
                            type='button'
                            onClick={() => {
                              if (readOnly) return;
                              setEditingRenameValue(
                                mapping.destination_field ?? ''
                              );
                              setEditingMappingIdx(idx);
                            }}
                            disabled={readOnly}
                            className={`
                              flex items-center gap-1 rounded-sm px-2 py-1
                              font-medium
                              ${
                                isRenamed
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-irmin-green-100 text-irmin-green-700'
                              }
                            `}
                          >
                            {mapping.destination_field || '—'}
                            {isRenamed && (
                              <TbArrowsExchange className='size-3' />
                            )}
                            {!readOnly && (
                              <TbEdit
                                className='
                                  size-3 opacity-0 transition-opacity
                                  group-hover:opacity-50
                                '
                              />
                            )}
                          </button>
                        )}
                      </div>
                      {/* Inline type cast dropdown and unwrap label */}
                      <div className='flex items-center gap-2'>
                        <select
                          aria-label={dict.schemaFieldMapper.noCastType}
                          value={mapping.cast_type ?? ''}
                          onChange={(e) =>
                            updateMappingCastType(idx, e.target.value)
                          }
                          disabled={readOnly}
                          className={`
                            h-6 rounded-sm border border-border bg-background
                            px-1.5 text-xs text-muted-foreground
                          `}
                        >
                          <option value=''>
                            {dict.schemaFieldMapper.noCastType}
                          </option>
                          {CAST_TYPE_OPTIONS.filter((t) => t !== '').map(
                            (type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            )
                          )}
                        </select>
                        {mode === 'standalone' && (
                          <Input
                            type='text'
                            placeholder={dict.schemaFieldMapper.unwrapLabel}
                            value={mapping.source_json_path ?? ''}
                            onChange={(e) =>
                              updateMappingJsonPath(idx, e.target.value)
                            }
                            readOnly={readOnly}
                            className='h-6 w-28 px-1.5 text-xs'
                          />
                        )}
                        {mode !== 'standalone' && mapping.source_json_path && (
                          <span
                            className={`
                              rounded-sm bg-sky-100 px-1.5 py-0.5 text-xs
                              font-medium text-sky-700
                            `}
                          >
                            {dict.schemaFieldMapper.unwrapLabel}:{' '}
                            {mapping.source_json_path}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className='flex justify-center gap-4'>
          {sourceHasFields && destinationHasFields && (
            <Button variant='gray' onClick={handleAutoMapIdenticalFields}>
              {dict.schemaFieldMapper.autoMapIdenticalFields}
            </Button>
          )}
          {hasMappings && (
            <Button variant='ghost' onClick={handleClearAllMappings}>
              {dict.schemaFieldMapper.clearAllMappings}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SchemaFieldMapper;
