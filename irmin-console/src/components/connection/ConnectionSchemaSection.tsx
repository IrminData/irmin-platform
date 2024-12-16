'use client';

import SchemaViewer from '@/components/repository/objects/SchemaViewer';

import { ObjectSchema } from '@/types/core/ObjectSchema';

/**
 * Connection Schema section component
 *
 * @param props - The props for the component
 * @param props.pullSchema - (optional) The schema for the pull operation
 */
const ConnectionSchemaSection = ({
  pullSchema,
}: {
  pullSchema?: ObjectSchema;
}) => {
  if (!pullSchema) {
    return (
      <div className='container relative mx-auto max-w-6xl px-4'>
        <div className='max-h-96 w-full overflow-y-scroll rounded bg-background'>
          <div className='flex h-full items-center justify-center'>
            <p className='text-lg text-gray-500'>No schema available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container relative mx-auto max-w-6xl px-4'>
      <div className='min-h-96 w-full overflow-y-scroll rounded bg-background'>
        <SchemaViewer objectSchema={pullSchema} />
      </div>
    </div>
  );
};

export default ConnectionSchemaSection;
