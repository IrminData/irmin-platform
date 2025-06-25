'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TbArrowRight, TbX } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { FieldMapping } from '@/types/core/Workflow';

import FieldGroup from './FieldGroup';
import type { Field } from './types';
import { autoMapIdenticalFields, groupFieldsByFile } from './utils';

const SchemaFieldMapper = ({
  initialMappings = [],
  onMappingsChange,
  sourceSchema,
  destinationSchema,
}: {
  initialMappings?: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  sourceSchema: ObjectSchema | null;
  destinationSchema: ObjectSchema | null;
}) => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const [mappings, setMappings] = useState<FieldMapping[]>(
    initialMappings ?? []
  );

  const [selectedSource, setSelectedSource] = useState<Field | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [hasManualMappings, setHasManualMappings] = useState(false);

  // Handle mappings change
  const previousMappings = useRef<FieldMapping[]>([]);
  const handleMappingsChange = useCallback(
    (newMappings: FieldMapping[]) => {
      setMappings(newMappings);
      if (
        JSON.stringify(newMappings) !== JSON.stringify(previousMappings.current)
      ) {
        onMappingsChange(newMappings);
        previousMappings.current = newMappings;
      }
    },
    [onMappingsChange]
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
    setExpandedFiles(allFiles);
  }, [sourceSchema, destinationSchema]);

  // Auto-map identical fields on schema changes, but only if user hasn't made manual mappings
  useEffect(() => {
    if (sourceSchema && destinationSchema && !hasManualMappings) {
      const result = autoMapIdenticalFields(
        sourceSchema,
        destinationSchema,
        []
      );
      if (result && result.autoMappedCount > 0) {
        handleMappingsChange(result.newMappings);
      }
    }
  }, [
    sourceSchema,
    destinationSchema,
    hasManualMappings,
    handleMappingsChange,
  ]);

  // Track if user has made manual mappings
  useEffect(() => {
    if (mappings.length > 0) {
      setHasManualMappings(true);
    }
  }, [mappings]);

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
    setSelectedSource(field);
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
      };

      handleMappingsChange([...filteredMappings, newMapping]);
      setSelectedSource(null);
    },
    [selectedSource, mappings, handleMappingsChange]
  );

  const removeMapping = useCallback(
    (destinationPath: string) => {
      handleMappingsChange(
        mappings.filter((m) => m.destination_path !== destinationPath)
      );
    },
    [mappings, handleMappingsChange]
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
  }, [handleMappingsChange]);

  const description = useMemo(() => {
    if (selectedSource) {
      return dict.schemaFieldMapper.descriptionWithSelection
        .replace('{fieldName}', selectedSource.name)
        .replace('{source}', selectedSource.source);
    }
    return dict.schemaFieldMapper.description;
  }, [
    selectedSource,
    dict.schemaFieldMapper.descriptionWithSelection,
    dict.schemaFieldMapper.description,
  ]);

  const mappingsCount = useMemo(() => mappings.length, [mappings]);

  const hasMappings = useMemo(() => mappings.length > 0, [mappings]);

  return (
    <div className='mx-auto w-full max-w-7xl space-y-4 py-4'>
      {/* Description Section */}
      <p className='text-foreground/80 text-center text-sm leading-relaxed'>
        {description}
      </p>

      <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
        {/* Source Fields */}
        <div className='border-border bg-background overflow-hidden rounded-xl border'>
          <div className='border-border from-card border-b bg-gradient-to-r px-4 py-2'>
            <h3 className='text-foreground text-lg font-medium'>
              {dict.schemaFieldMapper.sourceSchema}
            </h3>
          </div>
          <div className='max-h-[700px] space-y-3 overflow-y-auto p-2'>
            {sourceFileGroups.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='bg-muted mb-4 rounded-full p-3'>
                  <TbArrowRight className='text-muted-foreground h-6 w-6' />
                </div>
                <p className='text-muted-foreground text-sm'>
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
        <div className='border-border bg-background overflow-hidden rounded-xl border'>
          <div className='border-border from-card border-b bg-gradient-to-r px-4 py-2'>
            <h3 className='text-foreground text-lg font-medium'>
              {dict.schemaFieldMapper.destinationSchema}
            </h3>
          </div>
          <div className='max-h-[700px] space-y-3 overflow-y-auto p-2'>
            {destinationFileGroups.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='bg-muted mb-4 rounded-full p-3'>
                  <TbArrowRight className='text-muted-foreground h-6 w-6' />
                </div>
                <p className='text-muted-foreground text-sm'>
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
      <div className='border-border bg-background overflow-hidden rounded-xl border'>
        <div className='border-border from-irmin-green-100 to-irmin-teal-100 border-b bg-gradient-to-r px-6 py-4'>
          <h3 className='text-foreground text-lg font-medium'>
            {dict.schemaFieldMapper.fieldMappings}
            <span className='bg-irmin-green-200 text-irmin-green-700 ml-2 inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-medium'>
              {mappingsCount}
            </span>
          </h3>
        </div>
        <div className='max-h-96 space-y-3 overflow-y-auto p-4'>
          {!hasMappings ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='bg-muted mb-4 rounded-full p-3'>
                <TbArrowRight className='text-muted-foreground h-6 w-6' />
              </div>
              <p className='text-muted-foreground text-sm'>
                {dict.schemaFieldMapper.noMappingsYet}
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {mappings.map((mapping) => (
                <div
                  key={mapping.destination_path}
                  className='group border-border from-card to-background hover: relative rounded-lg border bg-gradient-to-r p-4 transition-all duration-200'
                >
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeMapping(mapping.destination_path)}
                    className='hover:bg-destructive/10 hover:text-destructive absolute top-2 right-2 h-6 w-6 p-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100'
                  >
                    <TbX className='h-3 w-3' />
                  </Button>
                  <div className='space-y-3 pr-8'>
                    <div className='space-y-1 text-xs'>
                      <div className='text-muted-foreground font-medium'>
                        {mapping.source_path}
                      </div>
                      <div className='text-muted-foreground font-medium'>
                        {mapping.destination_path}
                      </div>
                    </div>
                    <div className='flex items-center gap-3 text-sm'>
                      <span className='bg-irmin-blue-100 text-irmin-blue-700 rounded px-2 py-1 font-medium'>
                        {mapping.source_field}
                      </span>
                      <TbArrowRight className='text-primary h-4 w-4' />
                      <span className='bg-irmin-green-100 text-irmin-green-700 rounded px-2 py-1 font-medium'>
                        {mapping.destination_field}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex justify-center gap-4'>
        <Button variant='gray' onClick={handleAutoMapIdenticalFields}>
          {dict.schemaFieldMapper.autoMapIdenticalFields}
        </Button>
        {hasMappings && (
          <Button variant='ghost' onClick={handleClearAllMappings}>
            {dict.schemaFieldMapper.clearAllMappings}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SchemaFieldMapper;
