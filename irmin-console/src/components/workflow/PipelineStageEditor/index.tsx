'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { PipelineStage } from '@/types/core/Workflow';

import Stage from './Stage';

type PipelineStageEditorProps = {
  initialStages?: PipelineStage[];
  onSubmit?: (stages: PipelineStage[]) => void;
  readOnly?: boolean;
  hideSaveButton?: boolean;
  defaultCollapsed?: boolean;
};

/**
 * UI component for editing pipeline stages.
 *
 * @param props - The component props.
 * @param props.initialStages - The initial stages to display.
 * @param props.onSubmit - The function to call when the form is submitted.
 * @param props.readOnly - Whether the form is read-only.
 * @param props.hideSaveButton - Whether to hide the save button.
 *
 * @returns The rendered component.
 */
function PipelineStageEditor({
  initialStages = [],
  onSubmit,
  readOnly = false,
  hideSaveButton = false,
  defaultCollapsed = false,
}: PipelineStageEditorProps) {
  const { dict } = useLocale();
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);

  const prevStagesRef = useRef<PipelineStage[]>(stages);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Watch for changes and trigger onSubmit if the save button is disabled
  useEffect(() => {
    if (!hideSaveButton || !onSubmit) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      const hasChanged =
        JSON.stringify(prevStagesRef.current) !== JSON.stringify(stages);
      if (hasChanged) {
        prevStagesRef.current = stages;
        onSubmit(stages);
      }
    }, 300);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [stages, onSubmit, hideSaveButton]);

  const addStage = useCallback(() => {
    setStages((prevStages) => [
      ...prevStages,
      {
        description: '',
        write: true,
        read: true,
        type: 'action',
        executable: '',
      },
    ]);
  }, []);

  const removeStage = useCallback((index: number) => {
    setStages((prevStages) => prevStages.filter((_, i) => i !== index));
  }, []);

  const moveStage = useCallback((fromIndex: number, toIndex: number) => {
    setStages((prevStages) => {
      const newStages = [...prevStages];
      const [movedStage] = newStages.splice(fromIndex, 1);
      newStages.splice(toIndex, 0, movedStage);
      return newStages;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (onSubmit) {
        onSubmit(stages);
      }
    },
    [stages, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-4'>
        {stages.length === 0 && (
          <p className='text-foreground/50 py-8 text-center text-xl lg:text-3xl'>
            {dict.workflow.pipeline.noStages}
          </p>
        )}
        {stages.map((stage, index) => (
          <div key={index}>
            <Stage
              index={index}
              updateStage={(stage) => {
                setStages((prevStages) => {
                  const newStages = [...prevStages];
                  newStages[index] = stage;
                  return newStages;
                });
              }}
              moveStageUp={
                index > 0 ? () => moveStage(index, index - 1) : undefined
              }
              moveStageDown={
                index < stages.length - 1
                  ? () => moveStage(index, index + 1)
                  : undefined
              }
              removeStage={() => removeStage(index)}
              initialStage={stage}
              readOnly={readOnly}
              defaultCollapsed={defaultCollapsed}
            />
          </div>
        ))}
      </div>

      {!readOnly && (
        <Button
          type='button'
          onClick={addStage}
          className='w-full'
          variant={'secondary'}
        >
          {dict.workflow.pipeline.addStage}
        </Button>
      )}

      {!readOnly && !hideSaveButton && (
        <Button type='submit' className='w-full' size={'lg'} variant={'accent'}>
          {dict.workflow.pipeline.savePipelineStages}
        </Button>
      )}
    </form>
  );
}

export default React.memo(PipelineStageEditor);
