'use client';

import * as React from 'react';

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
interface MultiSelectProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
    icon?: React.ComponentType<{ className?: string }>;
  }[];

  /**
   * Callback function triggered when the selected values change.
   * Receives an array of the new selected values.
   */
  onValueChange: (value: string[]) => void;

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

export const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(
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
      React.useState<string[]>(defaultValue);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const popoverId = React.useId();

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
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

    const handleTogglePopover = () => {
      setIsPopoverOpen((prev) => !prev);
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
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type='button'
            role='combobox'
            aria-expanded={isPopoverOpen}
            aria-controls={popoverId}
            onClick={handleTogglePopover}
            disabled={loading || props.disabled}
            className={cn(
              "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              loading && 'cursor-wait',
              className
            )}
            {...props}
          >
            {selectedValues.length > 0 ? (
              <div className='flex w-full items-center justify-between gap-2'>
                <div className='flex flex-wrap items-center gap-1'>
                  {selectedValues.slice(0, maxCount).map((value) => {
                    const option = options.find((o) => o.value === value);
                    const IconComponent = option?.icon;
                    return (
                      <span
                        key={value}
                        className={cn(
                          'bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded border border-transparent px-1.5 py-0.5 text-xs font-medium',
                          isAnimating ? 'animate-bounce' : ''
                        )}
                        style={{ animationDuration: `${animation}s` }}
                      >
                        {IconComponent && (
                          <IconComponent className='h-3 w-3 shrink-0' />
                        )}
                        {option?.label}
                        <button
                          type='button'
                          className='hover:bg-secondary-foreground/20 ml-1 rounded-sm'
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOption(value);
                          }}
                        >
                          <TbX className='h-3 w-3' />
                        </button>
                      </span>
                    );
                  })}
                  {selectedValues.length > maxCount && (
                    <span
                      className={cn(
                        'bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded border border-transparent px-1.5 py-0.5 text-xs font-medium',
                        isAnimating ? 'animate-bounce' : ''
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      +{selectedValues.length - maxCount}
                      <button
                        type='button'
                        className='hover:bg-secondary-foreground/20 ml-1 rounded-sm'
                        onClick={(event) => {
                          event.stopPropagation();
                          clearExtraOptions();
                        }}
                      >
                        <TbX className='h-3 w-3' />
                      </button>
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-1'>
                  {!loading && (
                    <button
                      type='button'
                      className='hover:bg-accent rounded-sm p-1'
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClear();
                      }}
                    >
                      <TbX className='h-3 w-3' />
                    </button>
                  )}
                  <Separator orientation='vertical' className='h-4' />
                  {loading ? (
                    <TbLoader2 className='h-4 w-4 animate-spin opacity-50' />
                  ) : (
                    <TbChevronDown className='h-4 w-4 opacity-50' />
                  )}
                </div>
              </div>
            ) : (
              <div className='flex w-full items-center justify-between'>
                <span className='text-muted-foreground'>
                  {loading
                    ? 'Loading...'
                    : placeholder || dict.common.noOptionsMessage}
                </span>
                {loading ? (
                  <TbLoader2 className='h-4 w-4 animate-spin opacity-50' />
                ) : (
                  <TbChevronDown className='h-4 w-4 opacity-50' />
                )}
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={popoverId}
          className='w-[var(--radix-select-trigger-width)] p-0'
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
                      'border-border mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                      selectedValues.length === options.length
                        ? 'bg-muted text-muted-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                    <TbCheck className='h-4 w-4' />
                  </div>
                  {dict.common.selectAll || 'Select All'}
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
                          'border-border mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'bg-muted text-muted-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <TbCheck className='h-4 w-4' />
                      </div>
                      {option.icon && (
                        <option.icon className='text-muted-foreground mr-2 h-4 w-4' />
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
            className={cn(
              'hover:bg-accent mt-2 rounded-sm p-1 transition-colors',
              isAnimating ? 'text-primary' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          >
            <TbSparkles className='h-3 w-3' />
          </button>
        )}
      </Popover>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';
