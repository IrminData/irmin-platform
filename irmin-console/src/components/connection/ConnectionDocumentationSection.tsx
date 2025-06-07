'use client';

import Button from '@/components/ui/button';
import DocumentationForm from '@/components/ui/form/DocumentationForm';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

/**
 * Connection Documentation section component for displaying and updating the documentation.
 */
const ConnectionDocumentationSection = () => {
  const { dict } = useLocale();
  const { connectionQuery, updateConnectionMutation } = useConnectionContext();
  const { isResourceAllowed } = useResourceAllowed();

  if (connectionQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (!connectionQuery.data?.data) {
    return <h1>{dict.common.error}</h1>;
  }

  const connection = connectionQuery.data?.data;

  return (
    <DocumentationForm
      initialDocumentation={connection.documentation ?? ''}
      onSubmit={(data) => {
        updateConnectionMutation.mutate({
          name: connection.name,
          description: connection.description,
          documentation: data.documentation,
        });
      }}
      disabled={
        !isResourceAllowed(
          PolicyResource.Connection,
          PolicyAction.Update,
          connection.id
        )
      }
    >
      <Button
        size='sm'
        variant='default'
        type='submit'
        disabled={
          !isResourceAllowed(
            PolicyResource.Connection,
            PolicyAction.Update,
            connection.id
          )
        }
      >
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default ConnectionDocumentationSection;
