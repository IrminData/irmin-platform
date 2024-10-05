'use client';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/common/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/core/Repository';

/**
 * Repository Documentation section component for displaying and updating the documentation.
 *
 * @param props - The props.
 * @param props.repository - The repository to show and edit the documentation for.
 */
const RepositoryDocumentationSection = ({
  repository,
}: {
  repository: Repository;
}) => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const {
    repositories: { updateRepository },
  } = useWorkspace();

  const handleSaveDocumentation = async (data: DocumentationFormValues) => {
    try {
      const documentation = data.documentation.trim();
      const res = await updateRepository(repository.slug, {
        ...repository,
        documentation,
      });
      irminAlert(
        'success',
        res.message ?? dict.repository.settings.repositoryUpdated
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  };

  return (
    <div className='mt-0 lg:-mt-6' id='repository-documentation-section'>
      <DocumentationForm
        initialDocumentation={repository.documentation ?? ''}
        onSubmit={handleSaveDocumentation}
      >
        <Button
          size='sm'
          colorScheme='primary'
          variant='solid'
          type='submit'
          icon={<TbFile />}
        >
          {dict.repository.settings.saveChanges}
        </Button>
      </DocumentationForm>
    </div>
  );
};

export default RepositoryDocumentationSection;
