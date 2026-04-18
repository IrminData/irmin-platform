'use client';

import { useMemo, useState } from 'react';

import { TbAlertCircle, TbCheck, TbX } from 'react-icons/tb';

import { ObjectSchemaBuilder } from '@/components/schema-builder';
import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { useRepositoryObjectSchemaQuery } from '@/hooks/api/useRepositoryObjectSchema';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

/**
 * Modal for validating a repository object against a schema
 */
export default function ValidateObjectModal({
  validateObject,
  objectPath,
  repositorySlug,
  currentRef,
  workspaceSlug,
}: {
  validateObject: (
    validationSchema: ObjectSchema,
    validationMode: 'strict' | 'permissive'
  ) => Promise<{ valid: boolean; logs: string[]; error?: string }>;
  objectPath: string;
  repositorySlug: string;
  currentRef?: string;
  workspaceSlug: string;
}) {
  const { dict } = useLocale();

  const repositoryObjectSchemaQuery = useRepositoryObjectSchemaQuery(
    workspaceSlug,
    repositorySlug,
    currentRef,
    objectPath,
    { enabled: !!workspaceSlug && !!repositorySlug && !!objectPath }
  );

  // Initialize with a default schema
  const [schema, setSchema] = useState<ObjectSchema>({
    name: objectPath.split('/').pop() || 'object',
    path: objectPath,
    type: 'structured',
    content_type: 'application/json',
    schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  });

  // Preload schema when it becomes available
  const [prevSchemaData, setPrevSchemaData] = useState(
    repositoryObjectSchemaQuery.data?.data
  );
  if (repositoryObjectSchemaQuery.data?.data !== prevSchemaData) {
    setPrevSchemaData(repositoryObjectSchemaQuery.data?.data);
    if (repositoryObjectSchemaQuery.data?.data) {
      setSchema(repositoryObjectSchemaQuery.data.data);
    }
  }

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    logs: string[];
    error?: string;
  } | null>(null);

  // Create stable log entries with unique IDs to avoid React key collisions
  // when there are duplicate log messages
  const logsWithIds = useMemo(() => {
    if (!validationResult?.logs) return [];
    return validationResult.logs.map((log, idx) => ({
      id: `${idx}-${log}`,
      message: log,
    }));
  }, [validationResult]);

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);

    try {
      const result = await validateObject(schema, 'strict');
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        logs: [],
        error:
          error instanceof Error
            ? error.message
            : dict.repository.objects.invalidJsonSchema,
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-2'>
        <p className='text-xs text-muted-foreground'>
          {dict.repository.objects.validateObjectDescription}{' '}
          <code className='rounded-sm bg-muted px-1'>{objectPath}</code>
        </p>
      </div>

      <div className='flex flex-col gap-2'>
        <ObjectSchemaBuilder
          value={schema}
          onChange={setSchema}
          disabled={validating}
          allowedTypes={['structured']} // Usually we validate structured objects
        />
      </div>

      {validationResult && (
        <div
          className={`
            flex flex-col gap-2 rounded-md border p-2 text-xs
            ${
              validationResult.valid
                ? `
                  border-green-500 bg-green-50
                  dark:bg-green-950
                `
                : `
                  border-red-500 bg-red-50
                  dark:bg-red-950
                `
            }
          `}
        >
          <div className='flex items-center gap-2'>
            {validationResult.valid ? (
              <>
                <TbCheck
                  className={`
                    size-4 text-green-600
                    dark:text-green-400
                  `}
                />
                <span
                  className={`
                    font-semibold text-green-900
                    dark:text-green-100
                  `}
                >
                  {dict.repository.objects.validationPassed}
                </span>
              </>
            ) : (
              <>
                <TbX
                  className={`
                    size-4 text-red-600
                    dark:text-red-400
                  `}
                />
                <span
                  className={`
                    font-semibold text-red-900
                    dark:text-red-100
                  `}
                >
                  {dict.repository.objects.validationFailed}
                </span>
              </>
            )}
          </div>

          {validationResult.logs.length > 0 && (
            <div className='mt-1 flex flex-col gap-1'>
              <span className='font-semibold text-muted-foreground'>
                {dict.repository.objects.validationLogs}:
              </span>
              <div
                className={`
                  max-h-[150px] overflow-y-auto rounded-sm bg-background p-2
                  font-mono
                `}
              >
                {logsWithIds.map(({ id, message }) => (
                  <div
                    key={id}
                    className={`
                      ${
                        message.startsWith('✓')
                          ? `
                            text-green-600
                            dark:text-green-400
                          `
                          : ''
                      }
                      ${
                        message.startsWith('✗')
                          ? `
                            text-red-600
                            dark:text-red-400
                          `
                          : ''
                      }
                      ${
                        message.startsWith('⚠')
                          ? `
                            text-yellow-600
                            dark:text-yellow-400
                          `
                          : ''
                      }
                    `}
                  >
                    {message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResult.error && (
            <div
              className={`
                mt-1 flex items-start gap-2 rounded-sm bg-background p-2
              `}
            >
              <TbAlertCircle
                className={`
                  mt-0.5 size-3.5 shrink-0 text-red-600
                  dark:text-red-400
                `}
              />
              <span
                className={`
                  text-red-900
                  dark:text-red-100
                `}
              >
                {validationResult.error}
              </span>
            </div>
          )}
        </div>
      )}

      <Button
        variant='gradient'
        onClick={handleValidate}
        loading={validating}
        disabled={validating}
        className='my-4 w-full'
      >
        {dict.repository.objects.validate}
      </Button>
    </div>
  );
}
