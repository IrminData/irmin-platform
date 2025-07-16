'use client';

import { useMemo } from 'react';

import SafeComponent from '@/components/ui/error/SafeComponent';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryObjectSchema } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

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
  return (
    <SafeComponent
      level='section'
      title='Repository Schema Error'
      description='The repository schema section encountered an error. Please try refreshing the page.'
    >
      <RepositorySchemaSectionContent
        initialSelectedPath={initialSelectedPath}
      />
    </SafeComponent>
  );
}

function RepositorySchemaSectionContent({
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
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  if (!canViewSchema) {
    return (
      <div
        className={`
          w-full rounded-lg border border-gray-200 bg-card px-2 py-8
          dark:border-gray-800
        `}
      >
        <p
          className={`
            mx-auto mb-2 max-w-lg text-center text-lg text-card-foreground
            lg:text-2xl
          `}
        >
          {dict.common.insufficientPermissions}
        </p>
      </div>
    );
  }

  if (repositoryObjectSchemaQuery.isLoading)
    return (
      <div
        className={`
          relative container mx-auto mb-4 flex max-w-7xl flex-col px-2
          md:px-4
        `}
      >
        <LoadingSkeleton />
      </div>
    );

  if (!repositoryObjectSchemaQuery.data?.data) {
    return (
      <div
        className={`
          w-full rounded-lg border border-gray-200 bg-card px-2 py-8
          dark:border-gray-800
        `}
      >
        <p
          className={`
            mx-auto mb-2 max-w-lg text-center text-lg text-card-foreground
            lg:text-2xl
          `}
        >
          {dict.common.error}
        </p>
        <p
          className={`
            mx-auto max-w-lg text-center text-sm text-card-foreground/80
          `}
        >
          {dict.repository.schema.noSchema}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`
        relative container mx-auto mb-4 flex max-w-7xl flex-col px-2
        md:px-4
      `}
    >
      <SchemaViewer
        schema={repositoryObjectSchemaQuery.data?.data}
        isExpanded={true}
      />
    </div>
  );
}
