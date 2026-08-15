'use client';

import { TbX } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useLocale } from '@/context/LocaleContext';

/**
 * Accessible side sheet used by the create and edit wizards.
 *
 * Radix owns focus entry, focus containment, Escape dismissal, background
 * inerting, and focus restoration. The compact mobile progress summary avoids
 * squeezing every step label into the supported 375 px viewport.
 */
export default function SideModal({
  closeModal,
  isOpen,
  steps,
  currentStep,
  children,
  title,
  closeLabel,
}: {
  closeModal: () => void;
  isOpen: boolean;
  steps?: string[];
  currentStep?: number;
  children: React.ReactNode;
  title: string;
  closeLabel?: string;
}) {
  const { dict } = useLocale();
  const resolvedCloseLabel = closeLabel ?? dict.common.close;
  const hasProgress =
    steps !== undefined && currentStep !== undefined && steps.length > 1;
  const activeStep = hasProgress
    ? steps[Math.min(Math.max(currentStep - 1, 0), steps.length - 1)]
    : undefined;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <SheetContent
        side='right'
        hideCloseButton
        aria-describedby={undefined}
        className='
          w-full max-w-5xl gap-0 border-l border-border p-0
          sm:max-w-5xl
        '
      >
        <SheetHeader
          className={`
            flex-row items-center justify-between gap-4 border-b border-border
            px-4 py-3
            sm:px-6
          `}
        >
          <SheetTitle className='text-lg font-semibold'>{title}</SheetTitle>
          <Button
            size='icon'
            variant='ghost'
            onClick={closeModal}
            aria-label={resolvedCloseLabel}
          >
            <TbX aria-hidden='true' className='size-5' />
          </Button>
        </SheetHeader>

        {hasProgress && (
          <div
            className='
              border-b border-border px-4 py-3
              sm:px-6
            '
          >
            <div
              className='
                flex items-center gap-3
                sm:hidden
              '
            >
              <span
                className='
                  type-mono-small shrink-0 text-muted-foreground tabular-nums
                '
              >
                {currentStep} / {steps.length}
              </span>
              <span className='min-w-0 text-sm font-medium text-pretty'>
                {activeStep}
              </span>
            </div>

            <ol
              className='
                hidden items-start
                sm:flex
              '
            >
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCurrent = currentStep === stepNumber;
                const isComplete = currentStep > stepNumber;

                return (
                  <li
                    className='flex min-w-0 flex-1 items-center'
                    key={`${stepNumber}-${step}`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <span
                      className={`
                        flex size-8 shrink-0 items-center justify-center
                        rounded-full text-sm font-semibold tabular-nums
                        ${
                          isCurrent || isComplete
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      {stepNumber}
                    </span>
                    <span
                      className={`
                        ms-3 min-w-0 text-sm font-medium text-pretty
                        ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                      `}
                    >
                      {step}
                    </span>
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden='true'
                        className={`
                          mx-3 h-px min-w-4 flex-1
                          ${isComplete ? 'bg-accent' : 'bg-border'}
                        `}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div
          className='
            min-h-0 flex-1 overflow-y-auto px-4 py-5
            sm:px-6
          '
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
