'use client';

import { ReactNode, useState } from 'react';

import { Controller, useForm, UseFormReturn } from 'react-hook-form';

import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';

import Button from '@/components/common/button/Button';
import MDXEditor from '@/components/common/markdown-editor/MDXEditor';

import { useLocale } from '@/context/LocaleContext';

export interface DocumentationFormValues {
  documentation: string;
}

/**
 * Generic Documentation Form component for repositories, connections, and workflows.
 *
 * @param props - The props for the DocumentationForm component.
 * @param props.initialDocumentation - Initial value for the documentation field.
 * @param props.onSubmit - Function to handle the form submission.
 * @param props.children - Additional UI elements like buttons, which can be passed from parent components.
 */
const DocumentationForm = ({
  initialDocumentation,
  onSubmit,
  children,
}: {
  initialDocumentation: string;
  onSubmit: (data: DocumentationFormValues) => void;
  children?: ReactNode;
}) => {
  const { dict } = useLocale();

  const [documentationEditorType, setDocumentationEditorType] = useState<
    'mdx' | 'plain'
  >('mdx');

  // Initialize react-hook-form
  const { control, handleSubmit }: UseFormReturn<DocumentationFormValues> =
    useForm<DocumentationFormValues>({
      defaultValues: {
        documentation: initialDocumentation,
      },
    });

  return (
    <form
      className='container relative mx-auto flex max-w-6xl flex-1 flex-col overflow-scroll px-2 md:px-4'
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className='mb-4 flex flex-row items-center justify-end gap-2'>
        <Button
          onClick={() =>
            setDocumentationEditorType(
              documentationEditorType === 'mdx' ? 'plain' : 'mdx'
            )
          }
          variant='link'
          colorScheme='gray'
          size='sm'
          className='text-xs lg:text-base dark:text-gray-200'
          icon={
            documentationEditorType === 'mdx' ? (
              <BsFileEarmarkRichtext />
            ) : (
              <CiTextAlignLeft />
            )
          }
        >
          {documentationEditorType === 'mdx'
            ? dict.documentation.switchToPlainText
            : dict.documentation.switchToMarkdownEditor}
        </Button>
        {children}
      </div>
      {documentationEditorType === 'plain' && (
        <Controller
          name='documentation'
          control={control}
          render={({ field }) => (
            <textarea
              className='h-full w-full bg-gray-200 p-2 text-irmin_black focus:outline-none dark:bg-irmin_black dark:text-gray-200'
              placeholder={dict.documentation.startTypingDocumentation}
              id='plain-text-documentation-editor'
              value={field.value}
              onChange={field.onChange}
              rows={40}
            />
          )}
        />
      )}
      {documentationEditorType === 'mdx' && (
        <div
          id='mdx-documentation-editor'
          className='h-full max-h-full min-h-80 w-full overflow-y-scroll rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-irmin_black'
        >
          <Controller
            name='documentation'
            control={control}
            render={({ field }) => (
              <MDXEditor
                placeholder={dict.documentation.startTypingDocumentation}
                markdown={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      )}
    </form>
  );
};

export default DocumentationForm;
