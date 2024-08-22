import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { cn } from '@/utils/tw';

export default function Select({
  label,
  onChange,
  loading,
  currentValue,
  defaultValue,
  options,
  name = '',
  variant = 'default',
  selectClass = '',
  labelClass = '',
  required = false,
  multiple = false,
}: {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loading: boolean;
  currentValue?: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  name?: string;
  variant?: 'default' | 'on-dark-bg';
  selectClass?: string;
  labelClass?: string;
  required?: boolean;
  multiple?: boolean;
}) {
  const labelClasses = `-mb-2 mx-2 z-10 text-xs w-fit ${variant === 'on-dark-bg' ? 'text-gray-300 bg-irmin_black' : 'text-irmin_black bg-white dark:text-gray-300 dark:bg-irmin_black'} ${labelClass}`;

  const baseSelectClasses =
    'block w-full cursor-pointer rounded-lg border bg-opacity-0 text-sm font-light transition-all hover:bg-opacity-10 px-2 py-1 min-h-8 text-xs font-light lg:px-3 lg:text-sm lg:min-h-10';

  const classes =
    variant === 'on-dark-bg'
      ? 'bg-irmin_black text-gray-400 border-gray-600'
      : 'bg-irmin_green text-irmin_black dark:text-gray-200 border-gray-400';

  const selectClasses = `${baseSelectClasses} ${classes} ${selectClass}`;
  return (
    <div id='common-select' className='flex min-w-32 flex-col'>
      {currentValue !== '' && currentValue !== defaultValue && (
        <p className={cn(labelClasses.split(' '))}>{label}</p>
      )}
      {loading ? (
        <LoadingSkeleton className='h-8' />
      ) : (
        <div className={cn(selectClasses.split(' '))}>
          <div className='px-2 py-3'>
            <select
              className='w-full cursor-pointer bg-transparent focus:border-0 focus:outline-none focus:ring-0'
              value={currentValue}
              disabled={loading}
              onChange={onChange}
              aria-label={label}
              multiple={multiple}
              required={required}
              name={name}
            >
              {options?.map((w, i) => (
                <option key={`select-option-${w.value}-${i}`} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
