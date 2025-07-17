import { cn } from '@/utils/tw';

function DisplayTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        `
          font-display text-6xl font-bold tracking-tight text-foreground/90
          sm:text-6xl
        `,
        className
      )}
    >
      {children}
    </h1>
  );
}

export default DisplayTitle;
