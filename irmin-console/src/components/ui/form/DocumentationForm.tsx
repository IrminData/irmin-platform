'use client';

import { ReactNode, useState } from 'react';

import { Controller, useForm, UseFormReturn } from 'react-hook-form';

import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';

import CodeMirrorEditor from '@/components/editor/ide/CodeMirrorEditor';
import Button from '@/components/ui/button';
import MDXEditor from '@/components/ui/markdown-editor/MDXEditor';

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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className='container mx-auto mb-4 flex max-w-6xl flex-row items-center justify-end gap-2'>
        <Button
          onClick={() =>
            setDocumentationEditorType(
              documentationEditorType === 'mdx' ? 'plain' : 'mdx'
            )
          }
          variant='ghost'
          size='sm'
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
            : dict.documentation.switchToVisualEditor}
        </Button>
        {children}
      </div>
      <div className='container mx-auto mb-4 flex max-w-7xl'>
        {documentationEditorType === 'plain' && (
          <Controller
            name='documentation'
            control={control}
            render={({ field }) => (
              <div
                className='bg-background text-foreground h-full min-h-[400px] w-full p-2'
                id='plain-text-documentation-editor'
              >
                <CodeMirrorEditor
                  language='md'
                  content={field.value}
                  editorHeight='400px'
                  updateEditorContent={field.onChange}
                  placeholder={dict.documentation.startTypingDocumentation}
                />
              </div>
            )}
          />
        )}
        {documentationEditorType === 'mdx' && (
          <div
            id='mdx-documentation-editor'
            className='bg-background h-full max-h-full min-h-80 w-full overflow-y-scroll rounded-lg border border-gray-300 dark:border-gray-800'
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
      </div>
    </form>
  );
};

export default DocumentationForm;
