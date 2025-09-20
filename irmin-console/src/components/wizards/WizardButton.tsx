import { type ReactNode } from 'react';

interface WizardButtonProps {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}

/**
 * Reusable wizard button component with consistent styling
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
        flex w-full min-w-48 items-center gap-2 rounded-lg border-2 bg-card p-2
        text-left transition-colors
        hover:border-accent
      `}
      aria-label={title}
      type='button'
    >
      <div
        className={`
          flex aspect-square size-8 items-center justify-center rounded-full
          bg-accent/20 text-accent
        `}
      >
        {icon}
      </div>
      <div>
        <h3 className='text-sm font-medium'>{title}</h3>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
    </button>
  );
}
