import { Dictionary } from '@/lib/dict';

import { TbAlertCircle } from 'react-icons/tb';

/**
 * Error list component
 *
 * Used to display a list of errors
 *
 * @param props - The props to pass to the component
 * @param props.errors - The errors to display
 * @param props.dict - The dictionary object
 */
export default function ErrorList({
  errors,
  dict,
}: {
  errors: string[];
  dict: Dictionary;
}) {
  return (
    <div className='mx-auto flex h-0 max-w-2xl flex-1 flex-col gap-4 overflow-scroll px-2 pt-2'>
      {errors.length ? (
        <>
          <p className='py-4 pt-8 text-xl font-semibold text-gray-600 dark:text-gray-300'>
            {dict.query.errors} {errors.length > 0 ? `(${errors.length})` : ''}
          </p>
          {errors.map((error, index) => (
            <div
              key={`errors-${index}`}
              className='w-full rounded-lg border border-destructive bg-gray-50 p-4 dark:bg-red-900/20'
            >
              <div className='flex items-center gap-2'>
                <TbAlertCircle className='text-destructive' size={18} />
                <p className='text-sm font-medium text-destructive lg:text-base'>
                  {error}
                </p>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className='w-full px-4 py-12 text-center text-lg text-gray-400'>
          {dict.query.noErrors}
        </div>
      )}
    </div>
  );
}
