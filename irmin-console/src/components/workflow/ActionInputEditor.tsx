'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';

import { useRepositories } from '@/hooks/api';

import type { ActionInputData } from '@/types/core/Workflow';

interface ActionInputEditorProps {
  initialData?: ActionInputData[];
  onChange: (_inputFiles: ActionInputData[]) => void;
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

  // Use ref to store the latest onChange callback to avoid dependency issues
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Track previous initialData to detect external changes
  const prevInitialDataRef = useRef<ActionInputData[]>(initialData);

  // Sync initialData with local state when it changes from parent (controlled mode)
  // This is necessary for controlled component behavior
  useEffect(() => {
    if (!disableSaveButton) {
      const prevData = prevInitialDataRef.current;
      const hasChanged =
        prevData.length !== initialData.length ||
        prevData.some(
          (item, index) =>
            item.repository !== initialData[index]?.repository ||
            item.repository_ref !== initialData[index]?.repository_ref ||
            item.repository_path !== initialData[index]?.repository_path
        );

      if (hasChanged) {
        prevInitialDataRef.current = initialData;
        // Sync props to state in controlled mode - this is a valid use case
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInputFiles(initialData);
      }
    }
  }, [initialData, disableSaveButton]);

  // Notify parent of changes when save button is disabled
  useEffect(() => {
    if (disableSaveButton) {
      onChangeRef.current(inputFiles);
    }
  }, [inputFiles, disableSaveButton]);

  // Add a new input file
  const addInputFile = useCallback(() => {
    setInputFiles((prev) => [
      ...prev,
      { repository: '', repository_ref: '', repository_path: '' },
    ]);
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
        updateInputFile(index, 'repository_ref', '');
        return;
      }

      const repo = repositoriesQuery.data?.data?.find(
        (r) => r.slug === repositorySlug
      );
      if (repo) {
        updateInputFile(index, 'repository', repositorySlug);
        updateInputFile(index, 'repository_ref', repo.default_branch);
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
          key={`${inputFile.repository}-${inputFile.repository_ref}-${inputFile.repository_path}`}
          className='flex flex-col border-t border-foreground/10 py-4'
        >
          <div className='mb-4 flex items-center justify-between'>
            <h4 className='pl-1 text-base font-semibold'>
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

          <div className='flex flex-col gap-4'>
            {/* Repository Select */}
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`inputFiles.${index}.repository`}>
                {dict.repository.repository}
              </Label>
              <Select
                value={inputFile.repository}
                onValueChange={(value) => handleRepositoryChange(index, value)}
                disabled={repositoriesQuery.isLoading}
              >
                <SelectTrigger
                  id={`inputFiles.${index}.repository`}
                  className='w-full'
                >
                  <SelectValue>
                    {repositoriesQuery.data?.data?.find(
                      (repo) => inputFile.repository === repo.slug
                    )?.name ?? inputFile.repository}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {repositoriesQuery.data?.data?.map((repo) => (
                    <SelectItem key={repo.slug} value={repo.slug}>
                      {repo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Input */}
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`inputFiles.${index}.repository_ref`}>
                {dict.repository.branches.ref}
              </Label>
              <Input
                id={`inputFiles.${index}.repository_ref`}
                value={inputFile.repository_ref}
                onChange={(e) =>
                  updateInputFile(index, 'repository_ref', e.target.value)
                }
              />
            </div>

            {/* Path Input */}
            {inputFile.repository && inputFile.repository_ref && (
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`inputFiles.${index}.repository_path`}>
                  {dict.workflow.scriptInputFiles.path}
                </Label>
                <RepositoryPathSelector
                  repositorySlug={inputFile.repository}
                  repositoryRef={inputFile.repository_ref}
                  defaultPath={inputFile.repository_path}
                  defaultExpanded={false}
                  nonGroupOnly={true}
                  onPathChange={(path) =>
                    updateInputFile(index, 'repository_path', path)
                  }
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
