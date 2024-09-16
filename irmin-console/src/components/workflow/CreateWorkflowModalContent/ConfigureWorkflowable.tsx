'use client';

import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { WorkflowSetup } from '.';

/**
 * Configure workfow type specific properties
 *
 * @param props - Component properties
 * @param props.workflowData - Workflow setup data
 * @param props.setWorkflowData - Function to set the workflow setup data
 * @param props.setCurrentStep - Function to set the current step
 */
export default function ConfigureWorkflowable({
  workflowData,
  setWorkflowData,
  setCurrentStep,
}: {
  workflowData: WorkflowSetup;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const {
    repositories: { repositories },
    connections: { connections },
  } = useWorkspace();

  const handleContinue = () => {
    // Validate workflow specific fields
    if (
      workflowData.type === 'action' &&
      (!workflowData.path ||
        workflowData.path === '/' ||
        workflowData.path === '')
    ) {
      irminAlert('error', dict.workflow.create.error.selectScript);
      return;
    }
    if (
      (workflowData.type === 'import' || workflowData.type === 'export') &&
      !workflowData.connection
    ) {
      irminAlert('error', dict.workflow.create.error.selectConnection);
      return;
    }
    if (
      (workflowData.type === 'import' || workflowData.type === 'export') &&
      !workflowData.repository
    ) {
      irminAlert('error', dict.workflow.create.error.selectRepository);
      return;
    }
    if (
      (workflowData.type === 'import' || workflowData.type === 'export') &&
      (!workflowData.path || workflowData.path === '')
    ) {
      irminAlert('error', dict.workflow.create.error.selectPath);
      return;
    }
    // Continue to the next step
    setCurrentStep(2);
  };

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowData.type === 'action' && (
          <div>
            <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
              {dict.workflow.executableScriptFile}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='h-11 w-full'
              type='text'
              defaultValue={workflowData.path ?? '/'}
              onChange={(e) =>
                setWorkflowData({
                  ...workflowData,
                  path: e.target.value,
                })
              }
            />
          </div>
        )}
        {workflowData.type === 'import' && (
          <>
            <div>
              <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                {dict.workflow.importSourceConnection}
              </label>
              <ReactSelect
                value={{
                  value: workflowData.connection?.slug ?? '',
                  label: workflowData.connection?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    connection:
                      connections.find(
                        (conn) => conn.slug === newValue.value
                      ) ?? null,
                  });
                }}
                options={connections.map((conn) => ({
                  value: conn.slug,
                  label: conn.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
            <div>
              <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                {dict.workflow.importDestinationRepository}
              </label>
              <ReactSelect
                value={{
                  value: workflowData.repository?.slug ?? '',
                  label: workflowData.repository?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    repository:
                      repositories.find(
                        (repo) => repo.slug === newValue.value
                      ) ?? null,
                  });
                }}
                options={repositories.map((repo) => ({
                  value: repo.slug,
                  label: repo.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
            <div>
              <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                {dict.workflow.importDestinationPath}
              </label>
              <Input
                size='sm'
                variant='outline'
                colorScheme='gray'
                required
                className='h-11 w-full'
                type='text'
                defaultValue={workflowData.path ?? '/'}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    path: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}
        {workflowData.type === 'export' && (
          <>
            <div>
              <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                {dict.workflow.exportDestinationConnection}
              </label>
              <ReactSelect
                value={{
                  value: workflowData.connection?.slug ?? '',
                  label: workflowData.connection?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    connection:
                      connections.find(
                        (conn) => conn.slug === newValue.value
                      ) ?? null,
                  });
                }}
                options={connections.map((conn) => ({
                  value: conn.slug,
                  label: conn.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
            <div>
              <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                {dict.workflow.exportSourceRepository}
              </label>
              <ReactSelect
                value={{
                  value: workflowData.repository?.slug ?? '',
                  label: workflowData.repository?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    repository:
                      repositories.find(
                        (repo) => repo.slug === newValue.value
                      ) ?? null,
                  });
                }}
                options={repositories.map((repo) => ({
                  value: repo.slug,
                  label: repo.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
            <div>
              <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                {dict.workflow.exportSourcePath}
              </label>
              <Input
                size='sm'
                variant='outline'
                colorScheme='gray'
                required
                className='h-11 w-full'
                type='text'
                defaultValue={workflowData.path ?? '/'}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    path: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                {dict.workflow.exportRecursive}
              </label>
              <ReactSelect
                value={
                  workflowData.recursive
                    ? { value: true, label: dict.misc.yes }
                    : { value: false, label: dict.misc.no }
                }
                onChange={(newValue) => {
                  setWorkflowData({
                    ...workflowData,
                    recursive: newValue ? newValue.value : false,
                  });
                }}
                options={[
                  {
                    value: true,
                    label: dict.misc.yes,
                  },
                  {
                    value: false,
                    label: dict.misc.no,
                  },
                ]}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
          </>
        )}
      </div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='mb-6 inline-block w-full'
          variant='solid'
          colorScheme='primary'
          size='md'
          onClick={handleContinue}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
      </div>
    </div>
  );
}
