import { type JSX, memo, useEffect, useState } from 'react';

import {
  IoCheckmarkCircle,
  IoClose,
  IoInformationCircle,
  IoWarningOutline,
} from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';

import { useLocale } from '@/context/LocaleContext';

/**
 * Modern Alert UI component
 *
 * Features:
 * - Modern design with subtle animations
 * - Improved color scheme and typography
 * - Better spacing and visual hierarchy
 * - Responsive design
 * - Consistent with modern web app patterns
 * - Auto-dismiss with progress bar
 */
const Alert = ({
  type,
  message,
  onClose,
  duration = 10000, // 10 seconds default
}: {
  type: 'error' | 'info' | 'success';
  message: JSX.Element | string;
  onClose: () => void;
  duration?: number;
}) => {
  const { dict } = useLocale();
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Auto-dismiss timer
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for exit animation to complete before calling onClose
      setTimeout(onClose, 300);
    }, duration);

    // Progress countdown
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-green-200 dark:border-green-800',
          background: 'bg-green-50 dark:bg-green-950/50',
          icon: (
            <IoCheckmarkCircle
              className={`
                size-5 text-green-600
                dark:text-green-400
              `}
            />
          ),
          title: dict.common.success,
          titleColor: 'text-green-800 dark:text-green-200',
          progressColor: 'bg-green-500',
        };
      case 'error':
        return {
          border: 'border-red-200 dark:border-red-800',
          background: 'bg-red-50 dark:bg-red-950/50',
          icon: (
            <IoWarningOutline
              className={`
                size-5 text-red-600
                dark:text-red-400
              `}
            />
          ),
          title: dict.common.error,
          titleColor: 'text-red-800 dark:text-red-200',
          progressColor: 'bg-red-500',
        };
      case 'info':
        return {
          border: 'border-blue-200 dark:border-blue-800',
          background: 'bg-blue-50 dark:bg-blue-950/50',
          icon: (
            <IoInformationCircle
              className={`
                size-5 text-blue-600
                dark:text-blue-400
              `}
            />
          ),
          title: dict.common.info,
          titleColor: 'text-blue-800 dark:text-blue-200',
          progressColor: 'bg-blue-500',
        };
      default:
        return {
          border: 'border-gray-200 dark:border-gray-800',
          background: 'bg-gray-50 dark:bg-gray-950/50',
          icon: (
            <IoInformationCircle
              className={`
                size-5 text-gray-600
                dark:text-gray-400
              `}
            />
          ),
          title: dict.common.info,
          titleColor: 'text-gray-800 dark:text-gray-200',
          progressColor: 'bg-gray-500',
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div
      id='alert'
      className={`
        fixed right-4 bottom-4 z-60 duration-300 ease-out
        ${
          isExiting
            ? 'animate-out fade-out slide-out-to-bottom'
            : 'animate-in fade-in slide-in-from-bottom'
        }
      `}
    >
      <div
        className={`
          relative w-[400px] max-w-[calc(100vw-2rem)] rounded-lg border
          shadow-lg backdrop-blur-sm
          ${styles.border}
          ${styles.background}
        `}
      >
        {/* Close button */}
        <ButtonWithTooltip
          size='icon'
          variant='ghost'
          className={`
            absolute top-2 right-2 size-6 rounded-full
            hover:bg-gray-100
            dark:hover:bg-gray-800
          `}
          onClick={handleClose}
          aria-label={dict.common.close}
          tooltip={dict.common.close}
          icon={<IoClose className='size-4' />}
        />

        {/* Content */}
        <div className='p-4 pr-10'>
          <div className='flex items-start gap-3'>
            {/* Icon */}
            <div className='mt-0.5 shrink-0'>{styles.icon}</div>

            {/* Text content */}
            <div className='min-w-0 flex-1'>
              <h3
                className={`
                  text-sm font-medium
                  ${styles.titleColor}
                `}
              >
                {styles.title}
              </h3>
              <div
                className={`
                  mt-1 text-sm text-gray-700
                  dark:text-gray-300
                `}
              >
                {message}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        <div
          className={`
            absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-lg
            bg-gray-200
            dark:bg-gray-800
          `}
        >
          <div
            className={`
              h-full transition-all duration-100 ease-linear
              ${styles.progressColor}
            `}
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(Alert);
