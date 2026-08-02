'use client';

import { TbEye, TbFileCheck } from 'react-icons/tb';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useLocale } from '@/context/LocaleContext';

import ConnectionSchemaSection from './ConnectionSchemaSection';
import SchemaValidationSection from './SchemaValidationSection';

type SchemaTab = 'view' | 'validate';

/**
 * Connection Schema page content with tabs for viewing and validating schemas.
 *
 * @param props - The props for the component
 * @param props.operationMethod - The operation method (pull/push)
 * @param props.focusedPath - (optional) The path to focus on in the schema viewer
 * @param props.defaultTab - The default tab to show
 */
const ConnectionSchemaPageContent = ({
  operationMethod,
  focusedPath,
  defaultTab = 'view',
}: {
  operationMethod?: 'pull' | 'push';
  focusedPath?: string;
  defaultTab?: SchemaTab;
}) => {
  const { dict } = useLocale();

  return (
    <div className='relative container mx-auto max-w-7xl space-y-4 px-4'>
      <Tabs defaultValue={defaultTab} className='w-full'>
        <TabsList>
          <TabsTrigger value='view' className='gap-2'>
            <TbEye className='size-4' />
            {dict.connections.schemaValidation.viewTab}
          </TabsTrigger>
          <TabsTrigger value='validate' className='gap-2'>
            <TbFileCheck className='size-4' />
            {dict.connections.schemaValidation.validateTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='view'>
          <ConnectionSchemaSection
            operationMethod={operationMethod}
            focusedPath={focusedPath}
          />
        </TabsContent>

        <TabsContent value='validate'>
          <SchemaValidationSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConnectionSchemaPageContent;
