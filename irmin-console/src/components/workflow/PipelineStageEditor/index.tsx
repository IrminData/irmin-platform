'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TbArrowDown } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import type { PipelineStage } from '@/types/core/Workflow';

import Stage from './Stage';

type PipelineStageEditorProps = {
  initialStages?: PipelineStage[];
  onSubmit?: (_stages: PipelineStage[]) => void;
  readOnly?: boolean;
  hideSaveButton?: boolean;
  defaultCollapsed?: boolean;
  currentWorkflowID?: string;
};

/**
 * UI component for editing pipeline stages.
 *
 * @param props - The component props.
 * @param props.initialStages - The initial stages to display.
 * @param props.onSubmit - The function to call when the form is submitted.
 * @param props.readOnly - Whether the form is read-only.
 * @param props.hideSaveButton - Whether to hide the save button.
 * @param props.currentWorkflowID - The current workflow ID (to prevent self-reference).
 *
 * @returns The rendered component.
 */
function PipelineStageEditor({
  initialStages = [],
  onSubmit,
  readOnly = false,
  hideSaveButton = false,
  defaultCollapsed = false,
  currentWorkflowID,
}: PipelineStageEditorProps) {
  const { dict } = useLocale();

  // Ensure the first stage never has write: true and the last stage never has read: true
  const sanitizedInitialStages = useMemo(
    () =>
      initialStages.map((stage, index) => {
        const isFirst = index === 0;
        const isLast = index === initialStages.length - 1;
        return {
          ...stage,
          write: isFirst ? false : stage.write,
          read: isLast ? false : stage.read,
        };
      }),
    [initialStages]
  );

  const [stages, setStages] = useState<PipelineStage[]>(sanitizedInitialStages);

  const prevStagesRef = useRef<PipelineStage[]>(stages);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setStages((prevStages) => {
      const newStage: PipelineStage = {
        description: '',
        write: prevStages.length > 0,
        read: false,
        type: 'action',
        executable_type: 'script',
        script_id: undefined,
        query_id: undefined,
        order_sequence: prevStages.length,
      };
      const newStages = [...prevStages, newStage];
      // If there was a previous last stage, enable its read flag
      if (prevStages.length > 0) {
        newStages[prevStages.length - 1] = {
          ...newStages[prevStages.length - 1],
          read: true,
        };
      }
      return newStages;
    });
  }, []);

  const removeStage = useCallback((index: number) => {
    setStages((prevStages) => {
      const newStages = prevStages
        .filter((_, i) => i !== index)
        .map((stage, i) => ({
          ...stage,
          order_sequence: i,
        }));
      // Ensure the first stage never has write: true
      if (newStages.length > 0) {
        newStages[0] = {
          ...newStages[0],
          write: false,
        };
      }
      // Ensure the last stage never has read: true
      if (newStages.length > 0) {
        newStages[newStages.length - 1] = {
          ...newStages[newStages.length - 1],
          read: false,
        };
      }
      return newStages;
    });
  }, []);

  const moveStage = useCallback((fromIndex: number, toIndex: number) => {
    setStages((prevStages) => {
      const newStages = [...prevStages];
      const [movedStage] = newStages.splice(fromIndex, 1);
      newStages.splice(toIndex, 0, movedStage);
      // Re-index all order_sequence values and create new objects
      const reindexedStages = newStages.map((stage, i) => ({
        ...stage,
        order_sequence: i,
      }));
      // Ensure the first stage never has write: true
      if (reindexedStages.length > 0) {
        reindexedStages[0] = {
          ...reindexedStages[0],
          write: false,
        };
      }
      // Ensure the last stage never has read: true
      if (reindexedStages.length > 0) {
        reindexedStages[reindexedStages.length - 1] = {
          ...reindexedStages[reindexedStages.length - 1],
          read: false,
        };
      }
      return reindexedStages;
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

  // Calculate flow state
  const stagesWithFlow = useMemo(() => {
    return stages.reduce<{
      items: Array<PipelineStage & { inputHasData: boolean }>;
      hasData: boolean;
    }>(
      (acc, stage) => {
        const inputHasData = acc.hasData;
        const nextHasData = acc.hasData || stage.read;
        acc.items.push({ ...stage, inputHasData });
        return { items: acc.items, hasData: nextHasData };
      },
      { items: [], hasData: false }
    ).items;
  }, [stages]);

  return (
    <form onSubmit={handleSubmit} className='relative'>
      <div className='relative'>
        {stagesWithFlow.length === 0 && (
          <p
            className={`
              py-8 text-center text-xl text-foreground/50
              lg:text-3xl
            `}
          >
            {dict.workflow.pipeline.noStages}
          </p>
        )}
        {stagesWithFlow.map((stage, index) => {
          const isLast = index === stagesWithFlow.length - 1;
          const nextStage = !isLast ? stagesWithFlow[index + 1] : null;

          return (
            <div
              key={stage.order_sequence}
              className={`
                relative z-10 mb-6 flex gap-4
                last:mb-0
              `}
            >
              {/* Stage Marker / Timeline Node */}
              <div className='relative flex flex-col items-center pt-6'>
                {/* Line going DOWN from this marker to bottom of row */}
                {!isLast && (
                  <div
                    className={`
                      absolute top-6 bottom-0 left-4.5 w-0.5 -translate-x-1/2
                      ${nextStage?.inputHasData ? 'bg-primary' : 'bg-border'}
                    `}
                  />
                )}

                {/* Connector line segment from previous stage */}
                {index > 0 && (
                  <div
                    className={`
                      absolute -top-6 left-4.5 h-12 w-0.5 -translate-x-1/2
                      ${stage.inputHasData ? 'bg-primary' : 'bg-border'}
                    `}
                  />
                )}

                {/* Arrow Indicator on the line */}
                {index > 0 && (
                  <div
                    className={`
                      absolute -top-3 left-4.5 z-20 -translate-1/2 rounded-full
                      bg-background p-0.5
                      ${stage.inputHasData ? 'text-primary' : 'text-border'}
                    `}
                  >
                    <TbArrowDown className='size-4' />
                  </div>
                )}

                {/* The Node Circle */}
                <div
                  className={`
                    relative z-20 flex size-9 shrink-0 items-center
                    justify-center rounded-full border-4 border-background
                    font-mono text-sm font-medium transition-colors
                    ${
                      stage.write
                        ? `
                          bg-primary text-primary-foreground ring-2 ring-primary
                          ring-offset-2
                        `
                        : 'bg-muted text-foreground'
                    }
                    ${stage.read ? 'border-primary' : ''}
                  `}
                >
                  {index + 1}
                </div>

                {/* Output flow line (only visual start here) */}
                {/* The actual line is the background spine or next stage's connector */}
              </div>

              {/* The Card */}
              <div className='min-w-0 flex-1'>
                <Stage
                  index={stage.order_sequence}
                  updateStage={(stage) => {
                    setStages((prevStages) => {
                      const newStages = [...prevStages];
                      newStages[stage.order_sequence] = stage;
                      return newStages;
                    });
                  }}
                  moveStageUp={
                    stage.order_sequence > 0
                      ? () =>
                          moveStage(
                            stage.order_sequence,
                            stage.order_sequence - 1
                          )
                      : undefined
                  }
                  moveStageDown={
                    stage.order_sequence < stages.length - 1
                      ? () =>
                          moveStage(
                            stage.order_sequence,
                            stage.order_sequence + 1
                          )
                      : undefined
                  }
                  removeStage={() => removeStage(stage.order_sequence)}
                  initialStage={stage}
                  readOnly={readOnly}
                  defaultCollapsed={defaultCollapsed}
                  isLastStage={stage.order_sequence === stages.length - 1}
                  currentWorkflowID={currentWorkflowID}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <Button
          type='button'
          onClick={addStage}
          className='mt-8 w-full'
          variant={'secondary'}
        >
          {dict.workflow.pipeline.addStage}
        </Button>
      )}

      {!readOnly && !hideSaveButton && (
        <Button
          type='submit'
          className='mt-4 w-full'
          size={'lg'}
          variant={'accent'}
        >
          {dict.workflow.pipeline.savePipelineStages}
        </Button>
      )}
    </form>
  );
}

export default memo(PipelineStageEditor);
