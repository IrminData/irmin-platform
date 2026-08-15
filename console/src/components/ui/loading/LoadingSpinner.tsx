/**
 * Loading spinner with a localized accessible status label.
 */
const LoadingSpinner = ({ label }: { label: string }) => {
  return (
    <div
      role='status'
      aria-busy='true'
      aria-live='polite'
      className='flex h-full max-h-screen items-center justify-center py-16'
    >
      <div
        aria-hidden='true'
        className={`
          size-8 animate-spin rounded-full border-2 border-muted border-t-accent
        `}
      />
      <span className='sr-only'>{label}</span>
    </div>
  );
};

export default LoadingSpinner;
