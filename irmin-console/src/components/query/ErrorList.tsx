import { Dictionary } from '@/dictionaries';

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
  errors: Record<string, string[]>;
  dict: Dictionary;
}) {
  return (
    <div className='mx-auto flex h-0 max-w-2xl flex-1 flex-col gap-4 overflow-scroll px-2 pt-2'>
      {Object.keys(errors)?.length ? (
        <>
          <p className='py-4 pt-8 text-xl font-semibold text-gray-600 dark:text-gray-300'>
            {dict.query.errors}{' '}
            {Object.keys(errors).length > 0
              ? `(${Object.keys(errors).length})`
              : ''}
          </p>
          {Object.keys(errors).map((error, index) => (
            <div
              key={`errors-${index}`}
              className='w-full rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20'
            >
              <div className='mb-4 flex items-center gap-2'>
                <TbAlertCircle
                  className='text-red-600 dark:text-red-400'
                  size={24}
                />
                <p className='text-lg font-medium text-red-600 dark:text-red-400'>
                  {error}
                </p>
              </div>
              <ul className='ml-6 list-disc space-y-2'>
                {errors[error].map((err: string, i) => (
                  <li
                    key={`errors-${index}-error-${i}`}
                    className='text-left text-sm text-red-900 dark:text-red-100'
                  >
                    {err}
                  </li>
                ))}
              </ul>
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
