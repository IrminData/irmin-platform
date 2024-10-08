import { IoClose } from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/Button';

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
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${isOpen ? '' : 'hidden'}`}
    >
      <div className='relative h-full w-full'>
        <div
          className={`absolute bottom-0 right-0 top-0 h-full w-full max-w-3xl border-l bg-background shadow-lg transition-transform duration-200 dark:border-gray-800 ${
            isOpen ? 'animate-slideIn' : 'animate-slideOut'
          }`}
        >
          <div className='flex h-full flex-col justify-start'>
            <div className='z-10 mb-2 flex w-full items-center justify-between gap-4 px-4 pt-16'>
              <h3 className='text-lg lg:text-xl'>{title}</h3>
              <ButtonWithTooltip
                size='icon'
                variant='ghost'
                className='rounded-full'
                onClick={() => closeModal()}
                aria-label={closeLabel}
                tooltip={closeLabel}
                icon={<IoClose size={24} />}
              />
            </div>
            {steps && currentStep && steps.length > 1 && (
              <div className='flex items-center justify-start space-x-4 px-6 py-4'>
                {steps.map((step, index) => (
                  <div
                    className={`flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:text-left ${
                      index === steps.length - 1 ? '' : 'mr-0'
                    }`}
                    key={step}
                  >
                    <div
                      className={`flex aspect-square w-8 items-center justify-center rounded-full text-sm text-white lg:text-lg ${
                        currentStep >= index + 1
                          ? 'bg-irmin_green'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`mt-2 flex-shrink text-xs sm:mt-0 lg:text-sm ${
                        currentStep >= index + 1
                          ? 'text-irmin_green'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <hr className='border-t shadow-sm dark:border-gray-800' />
            <div className='grow overflow-y-scroll pb-12'>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
