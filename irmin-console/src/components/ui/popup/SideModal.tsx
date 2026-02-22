import { IoClose } from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';

/**
 * Side modal UI component with steps
 *
 * @remarks
 *
 * This modal is used for example when creating a Connection.
 * It has a title, steps, content and a close button.
 *
 * The position of the modal is fixed on the right side of the screen.
 *
 * @param props - The props
 * @param props.closeModal - Callback to close the modal
 * @param props.isOpen - Whether the modal is open or not
 * @param props.steps - The steps to display in the modal. If there are no steps, they will not be displayed
 * @param props.currentStep - The current step
 * @param props.children - The content of the modal
 * @param props.title - The title of the modal
 * @param props.closeLabel - The tooltip text for the close button
 */
export default function SideModal({
  closeModal,
  isOpen,
  steps,
  currentStep,
  children,
  title,
  closeLabel = 'Close modal',
}: {
  closeModal: () => void;
  isOpen: boolean;
  steps?: string[];
  currentStep?: number;
  children: React.ReactNode;
  title: string;
  closeLabel?: string;
}) {
  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xs
        ${!isOpen && 'hidden'}
      `}
    >
      <div className='relative size-full'>
        <div
          className={`
            absolute inset-y-0 right-0 size-full max-w-5xl border-l
            bg-background shadow-lg transition-transform duration-200
            dark:border-gray-800
            ${
              isOpen
                ? 'animate-in fade-in slide-in-from-right'
                : 'animate-out fade-out slide-out-to-right'
            }
          `}
        >
          <div className='flex h-full flex-col justify-start'>
            <div
              className={`
                sticky top-0 z-10 mb-4 flex w-full items-center justify-between
                gap-4 border-b bg-background px-6 py-4 pt-16
                lg:pt-4
                dark:border-gray-800
              `}
            >
              <h3
                className={`
                  text-lg font-semibold
                  lg:text-xl
                `}
              >
                {title}
              </h3>
              <ButtonWithTooltip
                size='icon'
                variant='ghost'
                className={`
                  rounded-full
                  hover:bg-gray-100
                  dark:hover:bg-gray-800
                `}
                onClick={() => closeModal()}
                aria-label={closeLabel}
                tooltip={closeLabel}
                icon={<IoClose size={20} />}
              />
            </div>
            {steps && currentStep && steps.length > 1 && (
              <div
                className={`
                  mx-6 mb-6 rounded-lg bg-gray-50 p-4
                  dark:bg-gray-800
                `}
              >
                <div className='flex items-center justify-between'>
                  {steps.map((step, index) => (
                    <div
                      className={`
                        flex flex-1 items-center
                        ${index >= steps.length - 1 && 'mr-4'}
                      `}
                      key={step}
                    >
                      <div className='flex items-center'>
                        <div
                          className={`
                            flex size-8 items-center justify-center rounded-full
                            text-sm font-semibold text-white
                            ${
                              currentStep >= index + 1
                                ? 'bg-accent shadow-md'
                                : `
                                  bg-gray-300
                                  dark:bg-gray-600
                                `
                            }
                          `}
                        >
                          {index + 1}
                        </div>
                        <span
                          className={`
                            ml-3 text-sm font-medium
                            ${
                              currentStep >= index + 1
                                ? 'text-accent'
                                : `
                                  text-gray-600
                                  dark:text-gray-400
                                `
                            }
                          `}
                        >
                          {step}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`
                            mx-3 flex-1 border-t
                            ${
                              currentStep > index + 1
                                ? 'border-accent'
                                : `
                                  border-gray-300
                                  dark:border-gray-600
                                `
                            }
                          `}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className='flex-1 overflow-y-auto px-6 pb-6'>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
