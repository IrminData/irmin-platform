'use client';

import { useMemo } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryObjectSchema } from '@/hooks/useRepositoryObjectSchema';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

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
  const { currentRef, repository } = useRepositoryContext();
  const { isResourceAllowed } = useResourceAllowed();
  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    repository.slug,
    currentRef,
    initialSelectedPath
  );

  const canViewSchema = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );

  if (!canViewSchema) {
    return (
      <div className='bg-card w-full rounded-lg border border-gray-200 px-2 py-8 dark:border-gray-800'>
        <p className='text-card-foreground mx-auto mb-2 max-w-lg text-center text-lg lg:text-2xl'>
          {dict.common.insufficientPermissions}
        </p>
      </div>
    );
  }

  if (repositoryObjectSchemaQuery.isLoading)
    return (
      <div className='relative container mx-auto mb-4 flex max-w-7xl flex-col px-2 md:px-4'>
        <LoadingSkeleton />
      </div>
    );

  if (!repositoryObjectSchemaQuery.data?.data) {
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
      <SchemaViewer
        schema={repositoryObjectSchemaQuery.data?.data}
        isExpanded={true}
      />
    </div>
  );
}
