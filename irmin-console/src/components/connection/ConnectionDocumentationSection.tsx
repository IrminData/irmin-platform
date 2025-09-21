'use client';

import { Button } from '@/components/ui/button';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import DocumentationForm from '@/components/ui/form/DocumentationForm';
import PageSkeleton from '@/components/ui/loading/PageSkeleton';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

/**
 * Connection Documentation section component for displaying and updating the documentation.
 */
const ConnectionDocumentationSection = () => {
  const { dict } = useLocale();
  const { connectionQuery, updateConnectionMutation } = useConnectionContext();
  const { isResourceAllowed } = useResourceAllowed();

  if (connectionQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (!connectionQuery.data?.data) {
    return (
      <CommonErrorDisplay
        variant='section'
        title={dict.common.error}
        description={dict.common.weEncounteredError}
        showReload={false}
        showDetails={false}
      />
    );
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
      disabled={!isResourceAllowed('connection', 'update', connection.id)}
    >
      <Button
        size='sm'
        variant='default'
        type='submit'
        disabled={!isResourceAllowed('connection', 'update', connection.id)}
      >
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default ConnectionDocumentationSection;
