'use client';

import type { ButtonHTMLAttributes, ComponentType, KeyboardEvent } from 'react';
import { forwardRef, useId, useState } from 'react';

import {
  TbCheck,
  TbChevronDown,
  TbLoader2,
  TbSparkles,
  TbX,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

/**
 * Props for MultiSelect component
 */
interface MultiSelectProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * An array of option objects to be displayed in the multi-select component.
   * Each option object has a label, value, and an optional icon.
   */
  options: {
    /** The text to display for the option. */
    label: string;
    /** The unique value associated with the option. */
    value: string;
    /** Optional icon component to display alongside the option. */
    icon?: ComponentType<{ className?: string }>;
  }[];

  /**
   * Callback function triggered when the selected values change.
   * Receives an array of the new selected values.
   */
  onValueChange: (_value: string[]) => void;

  /** The default selected values when the component mounts. */
  defaultValue?: string[];

  /**
   * Placeholder text to be displayed when no values are selected.
   * Optional, defaults to "Select options".
   */
  placeholder?: string;

  /**
   * Animation duration in seconds for the visual effects (e.g., bouncing badges).
   * Optional, defaults to 0 (no animation).
   */
  animation?: number;

  /**
   * Maximum number of items to display. Extra selected items will be summarized.
   * Optional, defaults to 3.
   */
  maxCount?: number;

  /**
   * The modality of the popover. When set to true, interaction with outside elements
   * will be disabled and only popover content will be visible to screen readers.
   * Optional, defaults to false.
   */
  modalPopover?: boolean;

  /**
   * Additional class names to apply custom styles to the multi-select component.
   * Optional, can be used to add custom styles.
   */
  className?: string;

  /**
   * Whether the component is in a loading state.
   * When true, shows a loading spinner and disables interaction.
   */
  loading?: boolean;
}

export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      defaultValue = [],
      placeholder,
      animation = 0,
      maxCount = 3,
      modalPopover = false,
      className,
      loading,
      ...props
    },
    ref
  ) => {
    const { dict } = useLocale();
    const [selectedValues, setSelectedValues] =
      useState<string[]>(defaultValue);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const popoverId = useId();
    const isDisabled = Boolean(loading || props.disabled);
    const selectedLabels = selectedValues.map(
      (value) =>
        options.find((option) => option.value === value)?.label ?? value
    );
    const extraSelectedLabels = selectedLabels.slice(maxCount);
    const triggerLabel = placeholder || dict.common.noOptionsMessage;

    const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        setIsPopoverOpen(true);
      } else if (event.key === 'Backspace' && !event.currentTarget.value) {
        const newSelectedValues = [...selectedValues];
        newSelectedValues.pop();
        setSelectedValues(newSelectedValues);
        onValueChange(newSelectedValues);
      }
    };

    const toggleOption = (option: string) => {
      const newSelectedValues = selectedValues.includes(option)
        ? selectedValues.filter((value) => value !== option)
        : [...selectedValues, option];
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    };

    const handleClear = () => {
      setSelectedValues([]);
      onValueChange([]);
    };

    const clearExtraOptions = () => {
      const newSelectedValues = selectedValues.slice(0, maxCount);
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    };

    const toggleAll = () => {
      if (selectedValues.length === options.length) {
        handleClear();
      } else {
        const allValues = options.map((option) => option.value);
        setSelectedValues(allValues);
        onValueChange(allValues);
      }
    };

    return (
      <Popover
        open={isPopoverOpen && !loading}
        onOpenChange={(open) => !loading && setIsPopoverOpen(open)}
        modal={modalPopover}
      >
        <div
          className={cn(
            `
              relative flex min-h-10 w-full items-center rounded-[2px] text-sm
              whitespace-nowrap
              [&_svg]:pointer-events-none [&_svg]:shrink-0
              [&_svg:not([class*='size-'])]:size-4
              [&_svg:not([class*='text-'])]:text-muted-foreground
            `,
            isDisabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          <PopoverTrigger asChild>
            <button
              {...props}
              ref={ref}
              type='button'
              role='combobox'
              aria-expanded={isPopoverOpen && !isDisabled}
              aria-controls={
                isPopoverOpen && !isDisabled ? popoverId : undefined
              }
              disabled={isDisabled}
              className={cn(
                `
                  absolute inset-0 z-0 cursor-pointer rounded-[2px] border
                  border-input bg-transparent transition-[color,box-shadow]
                  outline-none
                  hover:bg-input/50
                  focus-visible:border-ring focus-visible:ring-[3px]
                  focus-visible:ring-ring/50
                  disabled:cursor-not-allowed
                  aria-invalid:border-destructive
                  aria-invalid:ring-destructive/20
                  dark:bg-input/30
                  dark:aria-invalid:ring-destructive/40
                `,
                loading && 'cursor-wait'
              )}
            >
              <span className='sr-only'>
                {selectedLabels.length > 0
                  ? `${triggerLabel}: ${selectedLabels.join(', ')}`
                  : triggerLabel}
              </span>
            </button>
          </PopoverTrigger>

          <div
            className={`
              pointer-events-none relative z-10 flex w-full items-center
              justify-between gap-2 px-3 py-2
            `}
          >
            {selectedValues.length > 0 ? (
              <div className='flex flex-wrap items-center gap-1'>
                {selectedValues.slice(0, maxCount).map((value) => {
                  const option = options.find((o) => o.value === value);
                  const IconComponent = option?.icon;
                  const optionLabel = option?.label ?? value;
                  return (
                    <button
                      key={value}
                      type='button'
                      aria-label={`${dict.common.remove}: ${optionLabel}`}
                      disabled={isDisabled}
                      className={cn(
                        `
                          pointer-events-auto inline-flex min-h-6 cursor-pointer
                          items-center gap-1 rounded-[2px] border
                          border-transparent bg-secondary px-1.5 py-0.5 text-xs
                          font-medium text-secondary-foreground
                          hover:bg-secondary-foreground/20
                          focus-visible:outline-2 focus-visible:outline-offset-2
                          focus-visible:outline-accent
                          disabled:cursor-not-allowed
                        `,
                        isAnimating ? 'animate-bounce' : ''
                      )}
                      style={{ animationDuration: `${animation}s` }}
                      onClick={() => toggleOption(value)}
                    >
                      {IconComponent && (
                        <span aria-hidden='true'>
                          <IconComponent className='size-3 shrink-0' />
                        </span>
                      )}
                      {optionLabel}
                      <TbX aria-hidden='true' className='size-3' />
                    </button>
                  );
                })}
                {selectedValues.length > maxCount && (
                  <button
                    type='button'
                    aria-label={`${dict.common.remove}: ${extraSelectedLabels.join(', ')}`}
                    disabled={isDisabled}
                    className={cn(
                      `
                        pointer-events-auto inline-flex min-h-6 cursor-pointer
                        items-center gap-1 rounded-[2px] border
                        border-transparent bg-secondary px-1.5 py-0.5 text-xs
                        font-medium text-secondary-foreground
                        hover:bg-secondary-foreground/20
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-accent
                        disabled:cursor-not-allowed
                      `,
                      isAnimating ? 'animate-bounce' : ''
                    )}
                    style={{ animationDuration: `${animation}s` }}
                    onClick={clearExtraOptions}
                  >
                    +{selectedValues.length - maxCount}
                    <TbX aria-hidden='true' className='size-3' />
                  </button>
                )}
              </div>
            ) : (
              <span className='text-muted-foreground'>
                {loading ? dict.common.loading : triggerLabel}
              </span>
            )}

            <div className='flex items-center gap-1'>
              {selectedValues.length > 0 && !loading && (
                <button
                  type='button'
                  aria-label={`${dict.common.remove}: ${selectedLabels.join(', ')}`}
                  disabled={isDisabled}
                  className={`
                    pointer-events-auto inline-flex size-6 cursor-pointer
                    items-center justify-center rounded-[2px]
                    hover:bg-accent
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-accent
                    disabled:cursor-not-allowed
                  `}
                  onClick={handleClear}
                >
                  <TbX aria-hidden='true' className='size-3' />
                </button>
              )}
              <Separator orientation='vertical' className='h-4' />
              {loading ? (
                <TbLoader2
                  aria-hidden='true'
                  className='size-4 animate-spin opacity-50'
                />
              ) : (
                <TbChevronDown
                  aria-hidden='true'
                  className='size-4 opacity-50'
                />
              )}
            </div>
          </div>
        </div>
        <PopoverContent
          id={popoverId}
          className='w-(--radix-select-trigger-width) p-0'
          align='start'
        >
          <Command>
            <CommandInput
              placeholder={dict.common.search}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              <CommandEmpty>{dict.common.noResults}</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={toggleAll} className='cursor-pointer'>
                  <div
                    className={cn(
                      `
                        mr-2 flex size-4 items-center justify-center
                        rounded-[2px] border border-border
                      `,
                      selectedValues.length === options.length
                        ? 'bg-muted text-muted-foreground'
                        : `
                          opacity-50
                          [&_svg]:invisible
                        `
                    )}
                  >
                    <TbCheck className='size-4' />
                  </div>
                  {dict.common.selectAll}
                </CommandItem>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleOption(option.value)}
                      className='cursor-pointer'
                    >
                      <div
                        className={cn(
                          `
                            mr-2 flex size-4 items-center justify-center
                            rounded-[2px] border border-border
                          `,
                          isSelected
                            ? 'bg-muted text-muted-foreground'
                            : `
                              opacity-50
                              [&_svg]:invisible
                            `
                        )}
                      >
                        <TbCheck className='size-4' />
                      </div>
                      {option.icon && (
                        <option.icon
                          className={`mr-2 size-4 text-muted-foreground`}
                        />
                      )}
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <div className='flex items-center justify-between gap-2'>
                  {selectedValues.length > 0 && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='flex-1 justify-center'
                      onClick={handleClear}
                    >
                      {dict.common.remove}
                    </Button>
                  )}
                  <Button
                    variant='ghost'
                    size='sm'
                    className='flex-1 justify-center'
                    onClick={() => setIsPopoverOpen(false)}
                  >
                    {dict.common.close}
                  </Button>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        {animation > 0 && selectedValues.length > 0 && (
          <button
            type='button'
            aria-label={
              isAnimating
                ? dict.common.disableAnimations
                : dict.common.enableAnimations
            }
            aria-pressed={isAnimating}
            className={cn(
              `
                mt-2 inline-flex size-11 items-center justify-center
                rounded-[2px] transition-colors
                hover:bg-accent
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-accent
                md:size-8
              `,
              isAnimating ? 'text-primary' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          >
            <TbSparkles aria-hidden='true' className='size-3' />
          </button>
        )}
      </Popover>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';
