import {
  IoCheckbox,
  IoClose,
  IoInformationCircleOutline,
} from 'react-icons/io5';

import { useLocale } from '@/context/LocaleContext';

/**
 * Alert UI component
 *
 * @remarks
 *
 * UI for displaying alerts in a popup.
 *
 * It displays a message with an icon and a close button.
 *
 * This popup is shown when the user needs to be notified about something.
 * The position of the popup is fixed at the bottom of the screen.
 *
 * @param alertDetails - The details of the alert popup
 * @param alertDetails.type - The type of the alert popup
 * @param alertDetails.message - The message to display in the alert popup, can be a string or JSX element
 * @param alertDetails.onClose - The function to call when the user closes the alert
 *
 * @returns The alert popup component
 */
const Alert = ({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error' | 'info';
  message: string | JSX.Element;
  onClose: () => void;
}) => {
  const { dict } = useLocale();
  const successTitle = dict.misc.success;
  const errorTitle = dict.misc.error;
  const infoTitle = dict.misc.info;
  return (
    <div
      id='alert'
      className='fixed bottom-[20px] z-50 flex w-screen animate-slideInUp justify-center p-4 align-middle'
    >
      <div
        className={`flex w-[400px] max-w-[90vw] flex-row items-start justify-between rounded-lg border bg-gray-50 p-4 shadow-md dark:bg-irmin_black ${
          type === 'success'
            ? 'border-green-500 text-irmin_green-600 dark:text-irmin_green-400'
            : ''
        } ${type === 'error' ? 'border-red-500 text-red-700 dark:text-red-400' : ''} ${
          type === 'info'
            ? 'border-blue-500 text-irmin_blue dark:text-gray-200'
            : ''
        }`}
      >
        <div>
          <div className='flex flex-row pb-4 align-middle'>
            {type === 'success' && <IoCheckbox size={32} />}
            {type === 'error' && <IoClose size={32} />}
            {type === 'info' && <IoInformationCircleOutline size={32} />}
            <h2 className='ml-2 pt-[2px] text-lg font-medium'>
              {type === 'success' && successTitle}
              {type === 'error' && errorTitle}
              {type === 'info' && infoTitle}
            </h2>
          </div>
          <p className='pb-4 text-base font-normal'>{message}</p>
        </div>
        <button
          className='ml-4 text-irmin_black transition-all hover:opacity-50 dark:text-gray-200'
          onClick={onClose}
          aria-label='Close alert popup'
        >
          <IoClose size={24} />
        </button>
      </div>
    </div>
  );
};

export default Alert;
