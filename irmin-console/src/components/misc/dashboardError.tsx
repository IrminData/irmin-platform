import Button from '@/components/misc/Button';

function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='container relative z-10 mx-auto px-4 py-16 text-center'>
      <div className='py-16'>
        <span className='mb-4 inline-block rounded-full bg-irmin_green px-2 py-px text-xs font-medium leading-5 text-white shadow-sm'>
          Error
        </span>
        <h2 className='mb-4 text-4xl font-bold leading-tight tracking-tighter md:text-5xl'>
          Oops! Something went wrong
        </h2>
        <p className='mb-6 text-lg text-irmin_black md:text-xl'>
          We encountered an error: {error.message}. Please try again or contact
          support.
        </p>
        <div className='flex justify-center'>
          <div className='mx-2'>
            <Button
              variant='solid'
              colorScheme='primary'
              ariaLabel='Go back to Irmin App'
              size='md'
              href='/app'
            >
              Go back to Irmin App
            </Button>
          </div>
          <div className='mx-2'>
            <Button
              variant='outline'
              colorScheme='secondary'
              ariaLabel='Try Again'
              size='md'
              onClick={reset}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardError;
