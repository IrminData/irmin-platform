'use client';

import { memo, useCallback, useEffect } from 'react';

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import ReactSelect from 'react-select';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/core/Repository';
import { ActionInputData } from '@/types/core/Workflow';

interface ActionInputEditorFormData {
  inputFiles: ActionInputData[];
}

interface ActionInputEditorProps {
  repositories: Repository[];
  initialData?: ActionInputData[];
  onChange: (inputFiles: ActionInputData[]) => void;
  disableSaveButton?: boolean;
}

/**
 * Form to configure script input files using react-hook-form
 *
 * @param props - Component properties
 * @param props.repositories - List of repositories
 * @param props.initialData - Initial input files data
 * @param props.onChange - Callback to call when input files change
 * @param props.disableSaveButton - Disable the save button and auto-update on change
 */
function ActionInputEditor({
  repositories,
  initialData = [],
  onChange,
  disableSaveButton = false,
}: ActionInputEditorProps) {
  const { dict } = useLocale();

  // Initialize react-hook-form
  const { control, handleSubmit, watch, setValue } =
    useForm<ActionInputEditorFormData>({
      defaultValues: {
        inputFiles: initialData.length > 0 ? initialData : [],
      },
    });

  // Watch for changes when save button is disabled
  const inputFiles = watch('inputFiles');
  useEffect(() => {
    if (disableSaveButton) {
      onChange(inputFiles);
    }
  }, [inputFiles, disableSaveButton, onChange]);

  // Manage the input files array using useFieldArray
  const {
    fields: inputFileFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'inputFiles',
  });

  // Handle form submission
  const onSubmit = useCallback(
    (data: ActionInputEditorFormData) => {
      onChange(data.inputFiles);
    },
    [onChange]
  );

  // Add a new input file
  const addInputFile = useCallback(() => {
    append({
      repository: '',
      ref: '',
      path: '/',
    });
  }, [append]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4'
      id='action-input-editor-form'
    >
      <Label>{dict.workflow.scriptInputFiles.title}</Label>
      {/* Input Files Array */}
      {inputFileFields.map((inputFileField, index) => (
        <div
          key={inputFileField.id}
          className='border-foreground/10 flex flex-col border-t py-4'
        >
          <div className='mb-4 flex items-center justify-between'>
            <h4 className='text-md pl-1 font-semibold'>
              {dict.workflow.scriptInputFiles.inputFile} {index + 1}
            </h4>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => remove(index)}
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
              <Controller
                control={control}
                name={`inputFiles.${index}.repository`}
                render={({ field }) => (
                  <ReactSelect
                    id={`inputFiles.${index}.repository`}
                    value={{
                      value: field.value,
                      label:
                        repositories.find((repo) => field.value === repo.slug)
                          ?.name ?? field.value,
                    }}
                    onChange={(selectedOption) => {
                      field.onChange(selectedOption?.value);
                      const repo = repositories.find(
                        (repo) => selectedOption?.value === repo.slug
                      );
                      if (repo) {
                        // Set default branch when repository is selected
                        setValue(
                          `inputFiles.${index}.ref`,
                          repo.default_branch
                        );
                      }
                    }}
                    options={repositories.map((repo) => ({
                      value: repo.slug,
                      label: repo.name,
                    }))}
                    className='react-select-container'
                    classNamePrefix='react-select'
                  />
                )}
              />
            </div>

            {/* Branch Input */}
            <div className='space-y-2'>
              <Label htmlFor={`inputFiles.${index}.ref`}>
                {dict.repository.branches.ref}
              </Label>
              <Controller
                control={control}
                name={`inputFiles.${index}.ref`}
                render={({ field }) => (
                  <Input id={`inputFiles.${index}.ref`} {...field} />
                )}
              />
            </div>

            {/* Path Input */}
            <div className='space-y-2'>
              <Label htmlFor={`inputFiles.${index}.path`}>
                {dict.workflow.scriptInputFiles.path}
              </Label>
              <Controller
                control={control}
                name={`inputFiles.${index}.path`}
                render={({ field }) => (
                  <Input id={`inputFiles.${index}.path`} {...field} />
                )}
              />
            </div>
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
