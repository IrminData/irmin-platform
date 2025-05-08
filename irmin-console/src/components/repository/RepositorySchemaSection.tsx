'use client';

import { useEffect, useRef, useState } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

import { ObjectSchema } from '@/types/core/ObjectSchema';

import SchemaViewer from './objects/SchemaViewer';

/**
 * Repository schema section component
 *
 * @param props - The component props
 * @param props.initialSelectedPath - The initial selected path in the repository schema
 * @returns The repository section component
 */
export default function RepositorySchemaSection({
  initialSelectedPath = '',
}: {
  initialSelectedPath?: string;
}) {
  const { dict } = useLocale();
  const { getObjectSchema, currentRef } = useRepository();

  const [schema, setSchema] = useState<ObjectSchema | null>(null);
  const [loading, setLoading] = useState(false);

  const schemaFetchedFor = useRef<string | null>(null);
  useEffect(() => {
    // Make sure we are not fetching the same schema again
    const newSchemaFetchedFor = `${initialSelectedPath}@${currentRef}`;
    if (schemaFetchedFor.current === newSchemaFetchedFor) return;
    schemaFetchedFor.current = newSchemaFetchedFor;
    // Fetch the schema
    setLoading(true);
    getObjectSchema(initialSelectedPath)
      .then((schema) => {
        setSchema(schema);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [getObjectSchema, currentRef, initialSelectedPath]);

  if (loading)
    return (
      <div className='relative container mx-auto mb-4 flex max-w-7xl flex-col px-2 md:px-4'>
        <LoadingSkeleton />
      </div>
    );

  if (schema === null) {
    return (
      <div className='bg-card w-full rounded-lg border border-gray-200 px-2 py-8 dark:border-gray-800'>
        <p className='text-card-foreground mx-auto mb-2 max-w-lg text-center text-lg lg:text-2xl'>
          {dict.common.error}
        </p>
        <p className='text-card-foreground/80 mx-auto max-w-lg text-center text-sm'>
          {dict.repository.schema.noSchema}
        </p>
      </div>
    );
  }

  return (
    <div className='relative container mx-auto mb-4 flex max-w-7xl flex-col px-2 md:px-4'>
      <SchemaViewer schema={schema} isExpanded={true} />
    </div>
  );
}
