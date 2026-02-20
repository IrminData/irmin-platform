'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  TbAlertCircle,
  TbCheck,
  TbCircleCheck,
  TbCircleX,
  TbFile,
  TbLoader2,
  TbUpload,
  TbX,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema } from '@/hooks/api';
import { useConnectionSchemaValidation } from '@/hooks/api/useConnectionSchemaValidation';

import { cn } from '@/utils/tw';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type {
  SchemaDiff,
  SchemaFieldDiff,
  SchemaValidationError,
  SchemaValidationResult,
} from '@/types/core/SchemaValidation';

type ValidationMode = 'validate' | 'diff';

/**
 * Extracts expected file names from a schema (for group schemas, returns children names).
 */
function getExpectedFiles(schema: ObjectSchema | undefined): string[] {
  if (!schema) return [];
  // Group schemas are containers - return children names if available, empty array otherwise
  if (schema.type === 'group') {
    if (!schema.children || schema.children.length === 0) {
      return []; // Group without children has no expected files
    }
    return schema.children
      .filter((child) => child.type !== 'group')
      .map((child) => child.name);
  }
  // For non-group schemas, we expect files to match against this single schema
  return schema.name ? [schema.name] : [];
}

/**
 * Matches uploaded files to expected schema children.
 */
function matchFilesToSchema(
  files: File[],
  schema: ObjectSchema | undefined
): {
  matched: Array<{ file: File; schemaChild?: string }>;
  unmatched: File[];
  missing: string[];
} {
  const expectedFiles = getExpectedFiles(schema);
  const matched: Array<{ file: File; schemaChild?: string }> = [];
  const unmatched: File[] = [];

  for (const file of files) {
    const matchingSchema = expectedFiles.find(
      (expected) => expected.toLowerCase() === file.name.toLowerCase()
    );
    if (matchingSchema) {
      matched.push({ file, schemaChild: matchingSchema });
    } else if (schema?.type !== 'group') {
      // For non-group schemas, all files validate against the single schema
      matched.push({ file, schemaChild: schema?.name });
    } else {
      unmatched.push(file);
    }
  }

  // Find expected files that weren't provided
  const uploadedNames = files.map((f) => f.name.toLowerCase());
  const missing = expectedFiles.filter(
    (expected) => !uploadedNames.includes(expected.toLowerCase())
  );

  return { matched, unmatched, missing };
}

/**
 * Schema Validation Section component for testing data against connection schemas.
 * Supports multiple file uploads with smart auto-matching to schema children.
 */
const SchemaValidationSection = () => {
  const { connectionID, connectionQuery } = useConnectionContext();
  const { dict } = useLocale();
  const { validateSchemaMutation, diffSchemaMutation } =
    useConnectionSchemaValidation();

  const [mode, setMode] = useState<ValidationMode>('validate');
  const [userSelectedMethod, setUserSelectedMethod] = useState<
    'push' | 'pull' | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationResult, setValidationResult] =
    useState<SchemaValidationResult | null>(null);
  const [diffResult, setDiffResult] = useState<SchemaDiff | null>(null);

  const connection = connectionQuery.data?.data;
  const hasPush = connection?.connector.capabilities.includes('push');
  const hasPull = connection?.connector.capabilities.includes('pull');

  // Compute the effective operation method based on user selection and capabilities
  const operationMethod = useMemo(() => {
    if (userSelectedMethod === 'push' && hasPush) return 'push';
    if (userSelectedMethod === 'pull' && hasPull) return 'pull';
    if (hasPush) return 'push';
    if (hasPull) return 'pull';
    return 'push';
  }, [userSelectedMethod, hasPush, hasPull]);

  // Fetch the schema for the selected path to show expected files
  const { connectionSchemaQuery } = useConnectionSchema(
    connectionID,
    operationMethod,
    selectedPath ? [selectedPath] : undefined
  );

  const targetSchema = connectionSchemaQuery.data?.data ?? undefined;

  // Compute file matching info
  const fileMatchInfo = useMemo(
    () => matchFilesToSchema(selectedFiles, targetSchema),
    [selectedFiles, targetSchema]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        // Diff mode only supports a single file
        const fileArray = Array.from(files);
        setSelectedFiles(mode === 'diff' ? [fileArray[0]] : fileArray);
        setValidationResult(null);
        setDiffResult(null);
      }
    },
    [mode]
  );

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setValidationResult(null);
    setDiffResult(null);
  }, []);

  const handleValidate = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setValidationResult(null);
    setDiffResult(null);

    if (mode === 'validate') {
      const result = await validateSchemaMutation.mutateAsync({
        connectionID,
        operationMethod,
        files: selectedFiles,
        path: selectedPath || undefined,
      });
      if (result.data) {
        setValidationResult(result.data);
      }
    } else {
      // Diff mode only supports single file
      const result = await diffSchemaMutation.mutateAsync({
        connectionID,
        operationMethod,
        file: selectedFiles[0],
        path: selectedPath || undefined,
      });
      if (result.data) {
        setDiffResult(result.data);
      }
    }
  }, [
    selectedFiles,
    mode,
    connectionID,
    operationMethod,
    selectedPath,
    validateSchemaMutation,
    diffSchemaMutation,
  ]);

  const isMutationPending =
    validateSchemaMutation.isPending || diffSchemaMutation.isPending;

  // Handle mode change - clear results when switching modes
  const handleModeChange = useCallback((value: string) => {
    const newMode = value as ValidationMode;
    setMode(newMode);
    setValidationResult(null);
    setDiffResult(null);
    // Diff mode only supports a single file - keep only the first one if multiple are selected
    if (newMode === 'diff') {
      setSelectedFiles((prev) => (prev.length > 1 ? [prev[0]] : prev));
    }
  }, []);

  // Handle path change
  const handlePathChange = useCallback((path: string) => {
    setSelectedPath(path);
    setValidationResult(null);
    setDiffResult(null);
  }, []);

  // Show loading state while connection data is being fetched
  if (connectionQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  const expectedFilesForSchema = getExpectedFiles(targetSchema);

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{dict.connections.schemaValidation.title}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Mode and Operation Method Selection */}
          <div className='flex flex-wrap gap-4'>
            <div className='min-w-[200px] flex-1'>
              <label className='mb-2 block text-sm font-medium'>
                {dict.connections.schemaValidation.mode}
              </label>
              <Select
                value={mode}
                onValueChange={handleModeChange}
                disabled={isMutationPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='validate'>
                    {dict.connections.schemaValidation.validateMode}
                  </SelectItem>
                  <SelectItem value='diff'>
                    {dict.connections.schemaValidation.diffMode}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='min-w-[200px] flex-1'>
              <label className='mb-2 block text-sm font-medium'>
                {dict.connections.schemaValidation.operationMethod}
              </label>
              <Select
                value={operationMethod}
                onValueChange={(value) =>
                  setUserSelectedMethod(value as 'push' | 'pull')
                }
                disabled={isMutationPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hasPush && <SelectItem value='push'>Push</SelectItem>}
                  {hasPull && <SelectItem value='pull'>Pull</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Path Selection */}
          <div>
            <label
              htmlFor='schema-path-input'
              className='mb-2 block text-sm font-medium'
            >
              Schema Path (optional)
            </label>
            <input
              id='schema-path-input'
              type='text'
              value={selectedPath}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder='Leave empty for root schema, or enter a specific path'
              disabled={isMutationPending}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm',
                'focus:ring-2 focus:ring-primary focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
          </div>

          {/* Expected Files Info */}
          {targetSchema && expectedFilesForSchema.length > 0 && (
            <div className='rounded-md border bg-muted/30 p-3'>
              <p className='mb-2 text-sm font-medium'>
                Expected files in this schema:
              </p>
              <div className='flex flex-wrap gap-2'>
                {expectedFilesForSchema.map((fileName) => (
                  <span
                    key={fileName}
                    className={cn(
                      `
                        inline-flex items-center gap-1 rounded-md px-2 py-1
                        text-xs
                      `,
                      selectedFiles.some(
                        (f) => f.name.toLowerCase() === fileName.toLowerCase()
                      )
                        ? `
                          bg-green-500/20 text-green-700
                          dark:text-green-400
                        `
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <TbFile className='size-3' />
                    {fileName}
                    {selectedFiles.some(
                      (f) => f.name.toLowerCase() === fileName.toLowerCase()
                    ) && <TbCheck className='size-3' />}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className='mb-2 block text-sm font-medium'>
              {dict.connections.schemaValidation.uploadFile}
              {mode === 'validate' && (
                <span className='ml-1 text-muted-foreground'>
                  (multiple allowed)
                </span>
              )}
            </label>
            <div className='space-y-3'>
              <label
                className={cn(
                  `
                    flex items-center gap-2 rounded-md border border-dashed px-4
                    py-3
                  `,
                  'transition-colors',
                  isMutationPending
                    ? 'cursor-not-allowed opacity-50'
                    : `
                      cursor-pointer
                      hover:bg-accent/10
                    `,
                  selectedFiles.length > 0
                    ? 'border-primary'
                    : 'border-muted-foreground/50'
                )}
              >
                <TbUpload className='size-5' />
                <span className='text-sm'>
                  {selectedFiles.length === 0
                    ? dict.connections.schemaValidation.selectFile
                    : `${selectedFiles.length} file(s) selected`}
                </span>
                <input
                  type='file'
                  accept='.json,.jsonl,.ndjson,.csv,.tsv,.parquet,.xlsx,.xls,application/json,application/jsonl,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/x-parquet'
                  onChange={handleFileChange}
                  disabled={isMutationPending}
                  multiple={mode === 'validate'}
                  className='hidden'
                />
              </label>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className='space-y-2'>
                  {selectedFiles.map((file, index) => {
                    const matchInfo = fileMatchInfo.matched.find(
                      (m) => m.file === file
                    );
                    const isUnmatched = fileMatchInfo.unmatched.includes(file);

                    return (
                      <div
                        key={`${file.name}-${index}`}
                        className={cn(
                          `
                            flex items-center justify-between rounded-md border
                            px-3 py-2
                          `,
                          isUnmatched
                            ? 'border-yellow-500/50 bg-yellow-500/10'
                            : 'border-border'
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <TbFile className='size-4 text-muted-foreground' />
                          <span className='text-sm'>{file.name}</span>
                          {matchInfo?.schemaChild && (
                            <span
                              className={`
                                rounded bg-green-500/20 px-1.5 py-0.5 text-xs
                                text-green-700
                                dark:text-green-400
                              `}
                            >
                              → {matchInfo.schemaChild}
                            </span>
                          )}
                          {isUnmatched && (
                            <span
                              className={`
                                rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs
                                text-yellow-700
                                dark:text-yellow-400
                              `}
                            >
                              No matching schema
                            </span>
                          )}
                        </div>
                        <button
                          type='button'
                          onClick={() => handleRemoveFile(index)}
                          disabled={isMutationPending}
                          className={`
                            text-muted-foreground
                            hover:text-foreground
                            disabled:opacity-50
                          `}
                        >
                          <TbX className='size-4' />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Missing Files Warning */}
              {fileMatchInfo.missing.length > 0 && selectedFiles.length > 0 && (
                <div
                  className={`
                    rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3
                  `}
                >
                  <p
                    className={`
                      text-sm text-yellow-700
                      dark:text-yellow-400
                    `}
                  >
                    <TbAlertCircle className='mr-1 inline size-4' />
                    Missing expected files: {fileMatchInfo.missing.join(', ')}
                  </p>
                </div>
              )}

              <Button
                onClick={handleValidate}
                disabled={selectedFiles.length === 0 || isMutationPending}
              >
                {isMutationPending && (
                  <TbLoader2 className='mr-2 size-4 animate-spin' />
                )}
                {mode === 'validate'
                  ? dict.connections.schemaValidation.validateButton
                  : dict.connections.schemaValidation.compareButton}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && mode === 'validate' && (
        <ValidationResultDisplay result={validationResult} />
      )}

      {/* Diff Results */}
      {diffResult && mode === 'diff' && (
        <DiffResultDisplay result={diffResult} />
      )}
    </div>
  );
};

/**
 * Displays the validation result with errors and warnings.
 */
function ValidationResultDisplay({
  result,
}: {
  result: SchemaValidationResult;
}) {
  const { dict } = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {result.valid ? (
            <>
              <TbCircleCheck className='size-5 text-green-500' />
              <span>{dict.connections.schemaValidation.validationPassed}</span>
            </>
          ) : (
            <>
              <TbCircleX className='size-5 text-red-500' />
              <span>{dict.connections.schemaValidation.validationFailed}</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Summary */}
        {result.files_summary &&
          Object.keys(result.files_summary).length > 0 && (
            <div className='text-sm text-muted-foreground'>
              {Object.entries(result.files_summary).map(([file, count]) => (
                <p key={file} className='flex items-center gap-2'>
                  <TbFile className='size-4' />
                  {file}: {count} {dict.connections.schemaValidation.errors}
                </p>
              ))}
            </div>
          )}

        {/* Errors */}
        {result.errors && result.errors.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-red-500'>
              {dict.connections.schemaValidation.errorsTitle} (
              {result.errors.length})
            </h4>
            <div className='max-h-96 space-y-2 overflow-y-auto'>
              {result.errors.map((error, index) => (
                <ValidationErrorItem
                  key={`schema-validation-error-${error.field_path}-${error.type}-${error.row_index ?? index}`}
                  error={error}
                />
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.warnings && result.warnings.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-yellow-500'>
              {dict.connections.schemaValidation.warningsTitle} (
              {result.warnings.length})
            </h4>
            <ul className='list-inside list-disc space-y-1 text-sm'>
              {result.warnings.map((warning, index) => (
                <li
                  key={`schema-validation-warning-${index}-${warning}`}
                  className='text-muted-foreground'
                >
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Displays a single validation error.
 */
function ValidationErrorItem({ error }: { error: SchemaValidationError }) {
  return (
    <div className='rounded-md border border-red-500/20 bg-red-500/5 p-3'>
      <div className='flex items-start gap-2'>
        <TbAlertCircle className='mt-0.5 size-4 shrink-0 text-red-500' />
        <div className='flex-1 space-y-1'>
          <p className='font-mono text-sm font-medium'>{error.field_path}</p>
          <p className='text-sm text-muted-foreground'>{error.message}</p>
          {error.suggestion && (
            <p className='text-xs text-blue-500'>{error.suggestion}</p>
          )}
          <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
            {error.expected_type && (
              <span className='rounded bg-accent px-1.5 py-0.5'>
                Expected: {error.expected_type}
              </span>
            )}
            {error.actual_type && (
              <span className='rounded bg-accent px-1.5 py-0.5'>
                Actual: {error.actual_type}
              </span>
            )}
            {error.row_index !== undefined && (
              <span className='rounded bg-accent px-1.5 py-0.5'>
                Row: {error.row_index}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Displays the schema diff result.
 */
function DiffResultDisplay({ result }: { result: SchemaDiff }) {
  const { dict } = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {result.compatible ? (
            <>
              <TbCircleCheck className='size-5 text-green-500' />
              <span>{dict.connections.schemaValidation.schemasCompatible}</span>
            </>
          ) : (
            <>
              <TbAlertCircle className='size-5 text-yellow-500' />
              <span>
                {dict.connections.schemaValidation.schemasIncompatible}
              </span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <p className='text-sm text-muted-foreground'>{result.summary}</p>

        {/* Breaking Changes */}
        {result.breaking_changes && result.breaking_changes.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-red-500'>
              {dict.connections.schemaValidation.breakingChanges} (
              {result.breaking_changes.length})
            </h4>
            <div className='space-y-2'>
              {result.breaking_changes.map((change) => (
                <FieldDiffItem
                  key={`schema-diff-breaking-change-${change.field_path}-${change.change_type}`}
                  change={change}
                  isBreaking
                />
              ))}
            </div>
          </div>
        )}

        {/* Non-Breaking Changes */}
        {result.non_breaking_changes &&
          result.non_breaking_changes.length > 0 && (
            <div className='space-y-2'>
              <h4 className='font-medium text-yellow-500'>
                {dict.connections.schemaValidation.nonBreakingChanges} (
                {result.non_breaking_changes.length})
              </h4>
              <div className='space-y-2'>
                {result.non_breaking_changes.map((change) => (
                  <FieldDiffItem
                    key={`schema-diff-non-breaking-change-${change.field_path}-${change.change_type}`}
                    change={change}
                    isBreaking={false}
                  />
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

/**
 * Displays a single field diff.
 */
function FieldDiffItem({
  change,
  isBreaking,
}: {
  change: SchemaFieldDiff;
  isBreaking: boolean;
}) {
  const bgColor = isBreaking ? 'bg-red-500/5' : 'bg-yellow-500/5';
  const borderColor = isBreaking ? 'border-red-500/20' : 'border-yellow-500/20';

  return (
    <div className={cn('rounded-md border p-3', bgColor, borderColor)}>
      <div className='space-y-1'>
        <p className='font-mono text-sm font-medium'>{change.field_path}</p>
        {change.description && (
          <p className='text-sm text-muted-foreground'>{change.description}</p>
        )}
        <div className='flex flex-wrap gap-2 text-xs'>
          <span
            className={cn(
              'rounded px-1.5 py-0.5',
              change.change_type === 'added' &&
                'bg-green-500/20 text-green-500',
              change.change_type === 'removed' && 'bg-red-500/20 text-red-500',
              change.change_type === 'type_changed' &&
                'bg-yellow-500/20 text-yellow-500',
              change.change_type === 'required_changed' &&
                'bg-blue-500/20 text-blue-500',
              change.change_type === 'nullability_changed' &&
                'bg-cyan-500/20 text-cyan-500',
              change.change_type === 'modified' &&
                'bg-purple-500/20 text-purple-500'
            )}
          >
            {change.change_type.replace('_', ' ')}
          </span>
          {change.source_type && (
            <span
              className={`rounded bg-accent px-1.5 py-0.5 text-muted-foreground`}
            >
              From: {change.source_type}
            </span>
          )}
          {change.target_type && (
            <span
              className={`rounded bg-accent px-1.5 py-0.5 text-muted-foreground`}
            >
              To: {change.target_type}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SchemaValidationSection;
