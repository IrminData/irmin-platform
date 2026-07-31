import { type ReactNode } from 'react';

import { TbArrowRight } from 'react-icons/tb';

interface WizardButtonProps {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}

/**
 * Wizard entry-point button.
 *
 * Typography-first row rather than the old 3-column icon-in-circle card
 * grid — that was the classic AI-slop pattern on the dashboard. Here
 * each wizard is a flat hairline-separated row with a small inline icon
 * and a trailing arrow that slides on hover. Quiet until hovered, at
 * which point the title underlines in accent and the arrow nudges.
 */
export default function WizardButton({
  onClick,
  icon,
  title,
  description,
}: WizardButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group flex w-full min-w-48 flex-1 items-center gap-3 border-b
        border-border bg-transparent px-2 py-2.5 text-left
        transition-[background-color,border-color] duration-150
        hover:border-accent/60 hover:bg-muted/40
      `}
      aria-label={title}
      type='button'
    >
      <span className='shrink-0 text-muted-foreground' aria-hidden='true'>
        {icon}
      </span>
      <span className='min-w-0 flex-1'>
        <span
          className={`
            block truncate text-sm font-medium text-foreground transition-colors
            duration-150
            group-hover:text-accent
          `}
        >
          {title}
        </span>
        <span className='block truncate text-xs text-muted-foreground'>
          {description}
        </span>
      </span>
      <TbArrowRight
        className={`
          size-4 shrink-0 text-muted-foreground opacity-60 transition-transform
          duration-150
          group-hover:translate-x-0.5 group-hover:text-accent
          group-hover:opacity-100
        `}
        aria-hidden='true'
      />
    </button>
  );
}
