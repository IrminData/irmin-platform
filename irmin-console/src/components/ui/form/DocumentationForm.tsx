'use client';

import { ReactNode } from 'react';

import { Controller, useForm, UseFormReturn } from 'react-hook-form';

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
 * @param props.disabled - Whether the form is disabled.
 * @param props.children - Additional UI elements like buttons, which can be passed from parent components.
 */
const DocumentationForm = ({
  initialDocumentation,
  onSubmit,
  disabled,
  children,
}: {
  initialDocumentation: string;
  onSubmit: (data: DocumentationFormValues) => void;
  disabled?: boolean;
  children?: ReactNode;
}) => {
  const { dict } = useLocale();

  // Initialize react-hook-form
  const { control, handleSubmit }: UseFormReturn<DocumentationFormValues> =
    useForm<DocumentationFormValues>({
      defaultValues: {
        documentation: initialDocumentation,
      },
    });

  return (
    <form
      onSubmit={disabled ? undefined : handleSubmit(onSubmit)}
      id='mdx-documentation-editor'
      className='bg-background h-full max-h-full min-h-80 w-full overflow-y-scroll'
    >
      <Controller
        name='documentation'
        disabled={disabled}
        control={control}
        render={({ field }) => (
          <MDXEditor
            placeholder={dict.documentation.startTypingDocumentation}
            markdown={field.value}
            onChange={field.onChange}
          >
            {children}
          </MDXEditor>
        )}
      />
    </form>
  );
};

export default DocumentationForm;
