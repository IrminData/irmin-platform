import { type JSX, memo, useEffect, useState } from 'react';

import { TbAlertTriangle, TbCheck, TbInfoCircle, TbX } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';

import { useLocale } from '@/context/LocaleContext';

const EXIT_DURATION_MS = 150;

/**
 * Accessible global notification.
 *
 * Errors and rich notifications remain until dismissed. Routine string-only
 * success and information messages may time out, while a stable alert/status
 * role exposes every update to assistive technology.
 */
const Alert = ({
  type,
  message,
  onClose,
  duration = 10000,
}: {
  type: 'error' | 'info' | 'success';
  message: JSX.Element | string;
  onClose: () => void;
  duration?: number | null;
}) => {
  const { dict } = useLocale();
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const shouldAutoDismiss =
    duration !== null && type !== 'error' && typeof message === 'string';

  useEffect(() => {
    if (!shouldAutoDismiss) return;

    const timer = window.setTimeout(() => {
      setIsExiting(true);
      window.setTimeout(onClose, EXIT_DURATION_MS);
    }, duration);
    const interval = window.setInterval(() => {
      setProgress((previous) => Math.max(0, previous - 100 / (duration / 100)));
    }, 100);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [duration, onClose, shouldAutoDismiss]);

  const handleClose = () => {
    setIsExiting(true);
    window.setTimeout(onClose, EXIT_DURATION_MS);
  };

  const styles = {
    success: {
      border: 'border-success/50',
      icon: <TbCheck aria-hidden='true' className='size-5 text-success' />,
      title: dict.common.success,
      progress: 'bg-success',
    },
    error: {
      border: 'border-destructive/60',
      icon: (
        <TbAlertTriangle
          aria-hidden='true'
          className='size-5 text-destructive'
        />
      ),
      title: dict.common.error,
      progress: 'bg-destructive',
    },
    info: {
      border: 'border-border',
      icon: (
        <TbInfoCircle
          aria-hidden='true'
          className='size-5 text-muted-foreground'
        />
      ),
      title: dict.common.info,
      progress: 'bg-foreground',
    },
  }[type];

  return (
    <div
      id='alert'
      role={type === 'error' ? 'alert' : 'status'}
      aria-atomic='true'
      className={`
        fixed inset-e-4 bottom-4 z-60 duration-150 ease-out
        ${
          isExiting
            ? 'animate-out fade-out slide-out-to-bottom-2'
            : 'animate-in fade-in slide-in-from-bottom-2'
        }
      `}
    >
      <div
        className={`
          relative w-[min(25rem,calc(100vw-2rem))] rounded-[2px] border bg-card
          text-card-foreground
          ${styles.border}
        `}
      >
        <ButtonWithTooltip
          size='icon'
          variant='ghost'
          className='absolute inset-e-1 top-1'
          onClick={handleClose}
          aria-label={dict.common.close}
          tooltip={dict.common.close}
          icon={<TbX className='size-4' />}
        />

        <div className='flex items-start gap-3 p-4 pe-14'>
          <span className='mt-0.5 shrink-0'>{styles.icon}</span>
          <div className='min-w-0 flex-1'>
            <h3 className='text-sm font-semibold text-foreground'>
              {styles.title}
            </h3>
            <div className='mt-1 text-sm/relaxed text-foreground'>
              {message}
            </div>
          </div>
        </div>

        {shouldAutoDismiss && (
          <div
            aria-hidden='true'
            className='
              absolute inset-x-0 bottom-0 h-px overflow-hidden bg-muted
            '
          >
            <div
              className={`
                h-full transition-[width] duration-100 ease-linear
                ${styles.progress}
              `}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Alert);
