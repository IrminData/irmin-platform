'use client';

import { memo, useCallback, useEffect, useState } from 'react';

import ReactSelect from 'react-select';

import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { useRepositories } from '@/hooks/useRepositories';

import { ActionInputData } from '@/types/core/Workflow';

interface ActionInputEditorProps {
  initialData?: ActionInputData[];
  onChange: (inputFiles: ActionInputData[]) => void;
  disableSaveButton?: boolean;
}

/**
 * Form to configure script input files
 *
 * @param props - Component properties
 * @param props.initialData - Initial input files data
 * @param props.onChange - Callback to call when input files change
 * @param props.disableSaveButton - Disable the save button and auto-update on change
 */
function ActionInputEditor({
  initialData = [],
  onChange,
  disableSaveButton = false,
}: ActionInputEditorProps) {
  const { dict } = useLocale();
  const { repositoriesQuery } = useRepositories();
  const [inputFiles, setInputFiles] = useState<ActionInputData[]>(initialData);

  // Notify parent of changes when save button is disabled
  useEffect(() => {
    if (disableSaveButton) {
      onChange(inputFiles);
    }
  }, [inputFiles, disableSaveButton, onChange]);

  // Add a new input file
  const addInputFile = useCallback(() => {
    setInputFiles((prev) => [...prev, { repository: '', ref: '', path: '' }]);
  }, []);

  // Remove an input file
  const removeInputFile = useCallback((index: number) => {
    setInputFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update a specific field of an input file
  const updateInputFile = useCallback(
    (index: number, field: keyof ActionInputData, value: string) => {
      setInputFiles((prev) =>
        prev.map((file, i) =>
          i === index ? { ...file, [field]: value } : file
        )
      );
    },
    []
  );

  // Handle repository selection
  const handleRepositoryChange = useCallback(
    (index: number, repositorySlug: string | undefined) => {
      if (!repositorySlug) {
        updateInputFile(index, 'repository', '');
        updateInputFile(index, 'ref', '');
        return;
      }

      const repo = repositoriesQuery.data?.data?.find(
        (r) => r.slug === repositorySlug
      );
      if (repo) {
        updateInputFile(index, 'repository', repositorySlug);
        updateInputFile(index, 'ref', repo.default_branch);
      }
    },
    [repositoriesQuery.data?.data, updateInputFile]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onChange(inputFiles);
    },
    [inputFiles, onChange]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className='flex flex-col gap-4'
      id='action-input-editor-form'
    >
      <Label>{dict.workflow.scriptInputFiles.title}</Label>
      {/* Input Files Array */}
      {inputFiles.map((inputFile, index) => (
        <div
          key={index}
          className='border-foreground/10 flex flex-col border-t py-4'
        >
          <div className='mb-4 flex items-center justify-between'>
            <h4 className='text-md pl-1 font-semibold'>
              {dict.workflow.scriptInputFiles.inputFile} {index + 1}
            </h4>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => removeInputFile(index)}
            >
              {dict.common.remove}
            </Button>
          </div>

          <div className='space-y-4'>
            {/* Repository Select */}
            <div className='space-y-2'>
              <Label htmlFor={`inputFiles.${index}.repository`}>
                {dict.repository.repository}
              </Label>
              <ReactSelect
                id={`inputFiles.${index}.repository`}
                isLoading={repositoriesQuery.isLoading}
                value={{
                  value: inputFile.repository,
                  label:
                    repositoriesQuery.data?.data?.find(
                      (repo) => inputFile.repository === repo.slug
                    )?.name ?? inputFile.repository,
                }}
                onChange={(selectedOption) =>
                  handleRepositoryChange(index, selectedOption?.value)
                }
                options={repositoriesQuery.data?.data?.map((repo) => ({
                  value: repo.slug,
                  label: repo.name,
                }))}
                className='react-select-container'
                classNamePrefix='react-select'
              />
            </div>

            {/* Branch Input */}
            <div className='space-y-2'>
              <Label htmlFor={`inputFiles.${index}.ref`}>
                {dict.repository.branches.ref}
              </Label>
              <Input
                id={`inputFiles.${index}.ref`}
                value={inputFile.ref}
                onChange={(e) => updateInputFile(index, 'ref', e.target.value)}
              />
            </div>

            {/* Path Input */}
            {inputFile.repository && inputFile.ref && (
              <div className='space-y-2'>
                <Label htmlFor={`inputFiles.${index}.path`}>
                  {dict.workflow.scriptInputFiles.path}
                </Label>
                <RepositoryPathSelector
                  repositorySlug={inputFile.repository}
                  ref={inputFile.ref}
                  defaultPath={inputFile.path}
                  defaultExpanded={false}
                  nonGroupOnly={true}
                  onPathChange={(path) => updateInputFile(index, 'path', path)}
                />
              </div>
            )}
          </div>
        </div>
      ))}

      <div className='flex flex-wrap gap-2'>
        {/* Add Input File Button */}
        <Button onClick={addInputFile} variant={'gray'} className='w-full'>
          {dict.workflow.scriptInputFiles.addInputFile}
        </Button>

        {/* Submit Button */}
        {!disableSaveButton && (
          <Button type='submit' className='w-full' variant={'secondary'}>
            {dict.workflow.scriptInputFiles.save}
          </Button>
        )}
      </div>
    </form>
  );
}

export default memo(ActionInputEditor);
