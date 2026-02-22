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
          font-display text-2xl font-bold tracking-tight text-foreground/90
          sm:text-4xl
        `,
        className
      )}
    >
      {children}
    </h1>
  );
}

export default DisplayTitle;
