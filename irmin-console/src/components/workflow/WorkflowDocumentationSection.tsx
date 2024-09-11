'use client';

import React, { useCallback, useState } from 'react';

import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';
import { TbFile } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import MDXEditor from '@/components/common/markdown-editor/MDXEditor';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workflow } from '@/types/api/Workflow';

/**
 * Workflow Documentation section component for displaying and updating the documentation
 *
 * @param props0 - The props
 * @param props0.workflow - The workflow to editor the documentation for
 */
const WorkflowDocumentationSection = ({ workflow }: { workflow: Workflow }) => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const {
    workflows: { updateWorkflow },
  } = useWorkspace();

  const [currentDocumentation, setCurrentDocumentation] = useState(
    workflow.documentation ?? ''
  );
  const [documentationEditorType, setDocumentationEditorType] = useState<
    'mdx' | 'plain'
  >('mdx');

  /**
   * Updates the workflow with the new documentation provided
   * Uses {@link updateWorkflow} to update the workflow details
   * Shows {@link irminAlert} on success or error
   */
  const handleUpdateWorkflowDocumentation = useCallback(async () => {
    try {
      if (!workflow) return;
      const documentation = currentDocumentation.trim();
      if (documentation && documentation !== workflow.documentation) {
        await updateWorkflow(workflow.id, {
          ...workflow,
          documentation,
        });
        irminAlert('success', dict.workflow.settings.workflowUpdated);
      }
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.workflow.settings.errorUpdatingWorkflow
      );
    }
  }, [workflow, currentDocumentation, dict, irminAlert, updateWorkflow]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='px-2 md:px-4'>
        <div className='flex w-full flex-col gap-2 px-2'>
          <div className='my-4 flex flex-row items-center justify-between gap-4'>
            <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
              {dict.workflow.tabs.documentation}
            </h2>
            <div className='flex flex-row items-center gap-2'>
              <Button
                onClick={() =>
                  setDocumentationEditorType(
                    documentationEditorType === 'mdx' ? 'plain' : 'mdx'
                  )
                }
                variant='link'
                colorScheme={'gray'}
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
              <Button
                size='sm'
                colorScheme='primary'
                variant='solid'
                onClick={handleUpdateWorkflowDocumentation}
                icon={<TbFile />}
              >
                {dict.workflow.settings.saveChanges}
              </Button>
            </div>
          </div>
          <div className='flex h-0 flex-1 flex-col overflow-scroll'>
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
      </div>
    </div>
  );
};

export default WorkflowDocumentationSection;
