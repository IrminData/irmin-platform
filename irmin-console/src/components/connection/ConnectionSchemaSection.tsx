'use client';

import SchemaViewer from '@/components/repository/objects/SchemaViewer';

import { useLocale } from '@/context/LocaleContext';

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
  const { dict } = useLocale();
  if (!pullSchema) {
    return (
      <div className='relative container mx-auto max-w-6xl px-4'>
        <div className='flex h-full items-center justify-center py-4'>
          <p className='text-2xl'>{dict.repository.schema.noSchema}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='relative container mx-auto max-w-6xl px-4'>
      <div className='bg-background min-h-96 w-full overflow-y-scroll rounded'>
        <SchemaViewer objectSchema={pullSchema} />
      </div>
    </div>
  );
};

export default ConnectionSchemaSection;
