import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

export default function Select({
  label,
  onChange,
  loading,
  currentValue,
  defaultValue,
  options,
  variant = 'default',
}: {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loading: boolean;
  currentValue: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  variant?: 'default' | 'on-dark-bg';
}) {
  const labelClasses =
    variant === 'on-dark-bg' ? 'text-gray-300' : 'text-irmin_blue';
  const selectClasses =
    variant === 'on-dark-bg'
      ? 'bg-irmin_blue text-gray-400 border-gray-400'
      : 'bg-irmin_green text-irmin_black border-gray-400';
  return (
    <div id='common-select' className='flex flex-col'>
      {currentValue !== '' && currentValue !== defaultValue && (
        <p className={`-mb-2 px-4 text-xs ${labelClasses}`}>{label}</p>
      )}
      <div
        className={`block w-full cursor-pointer rounded-lg border border-opacity-20 bg-opacity-0 text-sm font-light transition-all hover:bg-opacity-10 ${selectClasses}`}
      >
        {loading ? (
          <LoadingSkeleton className='h-4' />
        ) : (
          <div className='px-4 py-3'>
            <select
              className='w-full cursor-pointer bg-transparent focus:border-0 focus:outline-none focus:ring-0'
              value={currentValue}
              disabled={loading}
              onChange={onChange}
              aria-label={label}
            >
              {options?.map((w, i) => (
                <option key={`select-option-${w.value}-${i}`} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
