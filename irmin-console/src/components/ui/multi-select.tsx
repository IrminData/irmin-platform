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
              `
                flex w-full items-center justify-between gap-2 rounded-md border
                border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap
                shadow-xs transition-[color,box-shadow] outline-none
                focus-visible:border-ring focus-visible:ring-[3px]
                focus-visible:ring-ring/50
                disabled:cursor-not-allowed disabled:opacity-50
                aria-invalid:border-destructive aria-invalid:ring-destructive/20
                data-placeholder:text-muted-foreground
                dark:bg-input/30
                dark:hover:bg-input/50
                dark:aria-invalid:ring-destructive/40
                [&_svg]:pointer-events-none [&_svg]:shrink-0
                [&_svg:not([class*='size-'])]:size-4
                [&_svg:not([class*='text-'])]:text-muted-foreground
              `,
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
                          `
                            inline-flex items-center gap-1 rounded-sm border
                            border-transparent bg-secondary px-1.5 py-0.5
                            text-xs font-medium text-secondary-foreground
                          `,
                          isAnimating ? 'animate-bounce' : ''
                        )}
                        style={{ animationDuration: `${animation}s` }}
                      >
                        {IconComponent && (
                          <IconComponent className='size-3 shrink-0' />
                        )}
                        {option?.label}
                        <button
                          type='button'
                          className={`
                            ml-1 rounded-sm
                            hover:bg-secondary-foreground/20
                          `}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOption(value);
                          }}
                        >
                          <TbX className='size-3' />
                        </button>
                      </span>
                    );
                  })}
                  {selectedValues.length > maxCount && (
                    <span
                      className={cn(
                        `
                          inline-flex items-center gap-1 rounded-sm border
                          border-transparent bg-secondary px-1.5 py-0.5 text-xs
                          font-medium text-secondary-foreground
                        `,
                        isAnimating ? 'animate-bounce' : ''
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      +{selectedValues.length - maxCount}
                      <button
                        type='button'
                        className={`
                          ml-1 rounded-sm
                          hover:bg-secondary-foreground/20
                        `}
                        onClick={(event) => {
                          event.stopPropagation();
                          clearExtraOptions();
                        }}
                      >
                        <TbX className='size-3' />
                      </button>
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-1'>
                  {!loading && (
                    <button
                      type='button'
                      className={`
                        rounded-sm p-1
                        hover:bg-accent
                      `}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClear();
                      }}
                    >
                      <TbX className='size-3' />
                    </button>
                  )}
                  <Separator orientation='vertical' className='h-4' />
                  {loading ? (
                    <TbLoader2 className='size-4 animate-spin opacity-50' />
                  ) : (
                    <TbChevronDown className='size-4 opacity-50' />
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
                  <TbLoader2 className='size-4 animate-spin opacity-50' />
                ) : (
                  <TbChevronDown className='size-4 opacity-50' />
                )}
              </div>
            )}
          </button>
        </PopoverTrigger>
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
                        mr-2 flex size-4 items-center justify-center rounded-sm
                        border border-border
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
                          `
                            mr-2 flex size-4 items-center justify-center
                            rounded-sm border border-border
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
            className={cn(
              `
                mt-2 rounded-sm p-1 transition-colors
                hover:bg-accent
              `,
              isAnimating ? 'text-primary' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          >
            <TbSparkles className='size-3' />
          </button>
        )}
      </Popover>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';
