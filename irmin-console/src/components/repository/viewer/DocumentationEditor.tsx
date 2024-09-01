'use client';

import React, { useState } from 'react';

import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';

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
          className='text-xs dark:text-gray-200'
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
      </div>
      <div className='flex h-0 flex-1 flex-col overflow-scroll px-2 pt-2'>
        {documentationEditorType === 'plain' && (
          <textarea
            className='h-full w-full bg-gray-200 p-2 text-irmin_black focus:outline-none dark:bg-irmin_black dark:text-gray-200'
            placeholder={dict.documentation.startTypingDocumentation}
            value={currentDocumentation}
            onChange={(e) => {
              setCurrentDocumentation(e.target.value);
            }}
            rows={20}
          />
        )}
        {documentationEditorType === 'mdx' && (
          <div className='h-full max-h-full min-h-80 w-full overflow-y-scroll rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-irmin_black'>
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
    </div>
  );
};

export default DocumentationEditor;
