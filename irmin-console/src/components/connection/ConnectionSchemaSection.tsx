'use client';

import SchemaViewer from '@/components/repository/objects/SchemaViewer';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema } from '@/hooks/api';

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
  operationMethod?: string;
}) => {
  const { connectionID } = useConnectionContext();
  const { dict } = useLocale();
  const { connectionSchemaQuery } = useConnectionSchema(
    connectionID,
    operationMethod
  );

  if (connectionSchemaQuery.isLoading) {
    return (
      <div className='relative container mx-auto max-w-7xl px-4'>
        <LoadingSkeleton className='h-80 w-full' />
      </div>
    );
  }

  if (!connectionSchemaQuery.data?.data) {
    return (
      <div className='relative container mx-auto max-w-7xl px-4'>
        <div className='flex h-full items-center justify-center py-4'>
          <p className='text-2xl'>{dict.repository.schema.noSchema}</p>
        </div>
      </div>
    );
  }
  return (
    <div className='relative container mx-auto max-w-7xl px-4'>
      <div className='min-h-96 w-full overflow-y-scroll rounded bg-background'>
        <SchemaViewer
          schema={connectionSchemaQuery.data.data}
          isExpanded={true}
          focusedPath={focusedPath}
        />
      </div>
    </div>
  );
};

export default ConnectionSchemaSection;
