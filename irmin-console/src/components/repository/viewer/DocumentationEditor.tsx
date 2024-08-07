'use client';

import React, { useState } from 'react';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import MDXEditor from '@/components/common/markdown-editor/MDXEditor';

import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';

/**
 * Repository Documentation component for displaying and updating the documentation
 *
 * @param props0 - The props
 * @param props0.repository - The repository to display and create the widgets for
 */
const DocumentationEditor = ({ repository }: { repository: Repository }) => {
  const { dict } = useLocale();

  const [currentDocumentation, setCurrentDocumentation] = useState(
    repository.documentation ?? ''
  );
  const [documentationEditorType, setDocumentationEditorType] = useState<
    'mdx' | 'plain'
  >('mdx');

  return (
    <div className='flex w-full flex-col gap-2'>
      <div className='ml-auto flex gap-2 text-right'>
        <Button
          onClick={() =>
            setDocumentationEditorType(
              documentationEditorType === 'mdx' ? 'plain' : 'mdx'
            )
          }
          variant='link'
          colorScheme={'gray'}
          size='sm'
          className='p-0 text-xs'
        >
          {documentationEditorType === 'mdx'
            ? dict.documentation.switchToPlainText
            : dict.documentation.switchToMarkdownEditor}
        </Button>
      </div>
      {documentationEditorType === 'plain' && (
        <Input
          size='sm'
          colorScheme='gray'
          variant='outline'
          className='h-full w-full border-gray-300 p-2 focus:outline-none'
          placeholder={dict.documentation.startTypingDocumentation}
          value={currentDocumentation}
          longtext={{ rows: 20 }}
          onChange={(e) => {
            setCurrentDocumentation(e.target.value);
          }}
        />
      )}
      {documentationEditorType === 'mdx' && (
        <div className='h-full min-h-80 w-full rounded-lg border border-gray-300 bg-white shadow'>
          <MDXEditor
            placeholder={dict.documentation.startTypingDocumentation}
            markdown={currentDocumentation}
            onChange={(markdown) => {
              setCurrentDocumentation(markdown);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentationEditor;
