'use client';

import SchemaViewer from '@/components/repository/objects/SchemaViewer';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema, useConnectionSchemaFetcher } from '@/hooks/api';

/**
 * Connection Schema section component
 *
 * @param props - The props for the component
 * @param props.focusedPath - (optional) The path to focus on
 */
const ConnectionSchemaSection = ({
  focusedPath,
  operationMethod,
}: {
  focusedPath?: string;
  operationMethod?: 'pull' | 'push';
}) => {
  const { connectionID } = useConnectionContext();
  const { dict } = useLocale();
  const { connectionSchemaQuery } = useConnectionSchema(
    connectionID,
    operationMethod,
    undefined // Get the root schema, so no paths specified
  );
  const { fetchPath } = useConnectionSchemaFetcher(
    connectionID,
    operationMethod
  );

  if (connectionSchemaQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (!connectionSchemaQuery.data?.data) {
    return (
      <div className='flex h-full items-center justify-center py-4'>
        <p className='text-2xl'>{dict.repository.schema.noSchema}</p>
      </div>
    );
  }
  return (
    <div className='min-h-96 w-full overflow-y-scroll rounded-sm bg-background'>
      <SchemaViewer
        key={`${connectionID}:${operationMethod ?? 'pull'}`}
        schema={connectionSchemaQuery.data.data}
        isExpanded={true}
        focusedPath={focusedPath}
        loadChildren={fetchPath}
      />
    </div>
  );
};

export default ConnectionSchemaSection;
