'use client';

import type React from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { format } from 'date-fns';

import { TbCopy, TbInfoCircle } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

// Common cron presets
const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at noon', value: '0 12 * * *' },
  { label: 'Every Monday', value: '0 0 * * 1' },
  { label: 'Every weekday', value: '0 0 * * 1-5' },
  { label: 'Every weekend', value: '0 0 * * 0,6' },
  { label: 'Every month', value: '0 0 1 * *' },
];

// Options for each cron field
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString());
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString());
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];
const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

// Simple cron validation function
const isValidCron = (cron: string): boolean => {
  // Basic regex pattern for cron expressions
  const cronPattern =
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])-([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]),([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])|([0-9]|1[0-9]|2[0-3])-([0-9]|1[0-9]|2[0-3])|([0-9]|1[0-9]|2[0-3]),([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])|([1-9]|1[0-9]|2[0-9]|3[0-1])-([1-9]|1[0-9]|2[0-9]|3[0-1])|([1-9]|1[0-9]|2[0-9]|3[0-1]),([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])|([1-9]|1[0-2])-([1-9]|1[0-2])|([1-9]|1[0-2]),([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6])|([0-6])-([0-6])|([0-6]),([0-6]))$/;

  return cronPattern.test(cron);
};

// Calculate next execution dates for a cron expression
const getNextExecutionDates = (cronExpression: string, count = 5): Date[] => {
  if (!isValidCron(cronExpression)) {
    return [];
  }

  const dates: Date[] = [];
  const now = new Date();

  // Parse the cron expression
  const [minute, hour, dayOfMonth, month, dayOfWeek] =
    cronExpression.split(' ');

  // Start with the current date
  const nextDate = new Date(now);

  // Simple implementation to find the next few execution dates
  // This is a simplified version and doesn't handle all cron features
  for (let i = 0; i < count; i++) {
    // Move to the next minute to start searching
    if (i === 0) {
      nextDate.setMinutes(nextDate.getMinutes() + 1);
      nextDate.setSeconds(0);
      nextDate.setMilliseconds(0);
    } else {
      nextDate.setMinutes(nextDate.getMinutes() + 1);
    }

    // Find the next matching date
    while (!matchesCron(nextDate, minute, hour, dayOfMonth, month, dayOfWeek)) {
      nextDate.setMinutes(nextDate.getMinutes() + 1);
    }

    dates.push(new Date(nextDate));
  }

  return dates;
};

// Check if a date matches the cron expression parts
const matchesCron = (
  date: Date,
  minute: string,
  hour: string,
  dayOfMonth: string,
  month: string,
  dayOfWeek: string
): boolean => {
  const m = date.getMinutes();
  const h = date.getHours();
  const dom = date.getDate();
  const mon = date.getMonth() + 1; // JavaScript months are 0-based
  const dow = date.getDay(); // 0 is Sunday

  return (
    matchesField(m, minute, 0, 59) &&
    matchesField(h, hour, 0, 23) &&
    matchesField(dom, dayOfMonth, 1, 31) &&
    matchesField(mon, month, 1, 12) &&
    matchesField(dow, dayOfWeek, 0, 6)
  );
};

// Check if a value matches a cron field expression
const matchesField = (
  value: number,
  field: string,
  min: number,
  max: number
): boolean => {
  // Handle asterisk (any value)
  if (field === '*') {
    return true;
  }

  // Handle specific value
  if (!isNaN(Number.parseInt(field))) {
    return value === Number.parseInt(field);
  }

  // Handle comma-separated values
  if (field.includes(',')) {
    return field.split(',').some((f) => matchesField(value, f, min, max));
  }

  // Handle ranges
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return value >= start && value <= end;
  }

  // Handle step values
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const stepNum = Number.parseInt(step);

    if (range === '*') {
      return (value - min) % stepNum === 0;
    }

    // Handle range with step
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      return value >= start && value <= end && (value - start) % stepNum === 0;
    }
  }

  return false;
};

/**
 * Cron Generator is a component that generates a cron expression based on the user's input
 *
 * @param props
 * @param props.expression - The initial cron expression to display
 * @param props.onSave - The function to call when the cron expression is saved / updated
 * @param props.isDisabled - Whether the cron generator is disabled
 */
const CronGenerator = ({
  expression = '0 0 * * *',
  onSave,
  isDisabled = false,
}: {
  expression?: string;
  onSave: (cron: string) => void;
  isDisabled?: boolean;
}) => {
  const { dict } = useLocale();
  const [activeTab, setActiveTab] = useState('presets');
  const [cronExpression, setCronExpression] = useState(expression);
  const [nextDates, setNextDates] = useState<Date[]>([]);
  const [copied, setCopied] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Custom fields state (lazy initialization to avoid object creation on every render)
  const [minute, setMinute] = useState(() => ({ type: 'every', value: '*' }));
  const [hour, setHour] = useState(() => ({ type: 'specific', value: '0' }));
  const [dayOfMonth, setDayOfMonth] = useState(() => ({
    type: 'every',
    value: '*',
  }));
  const [month, setMonth] = useState(() => ({ type: 'every', value: '*' }));
  const [dayOfWeek, setDayOfWeek] = useState(() => ({
    type: 'every',
    value: '*',
  }));

  // Update cron expression when prop changes
  useEffect(() => {
    setCronExpression(expression);
  }, [expression]);

  // Parse current expression to set custom fields ONLY when switching tabs
  const prevCronAndTab = useRef({
    activeTab: '',
    cronExpression: '',
    isInitializing: false,
  });
  useEffect(() => {
    // Skip if we're already processing a tab change
    if (prevCronAndTab.current.isInitializing) return;

    // Skip if nothing has changed
    if (
      prevCronAndTab.current.activeTab === activeTab &&
      prevCronAndTab.current.cronExpression === cronExpression
    )
      return;

    // Set flag to prevent recursive updates
    prevCronAndTab.current.isInitializing = true;

    // Update ref values
    prevCronAndTab.current.activeTab = activeTab;
    prevCronAndTab.current.cronExpression = cronExpression;

    if (activeTab === 'custom') {
      const parts = cronExpression.split(' ');
      if (parts.length === 5) {
        setMinute({
          type: parts[0] === '*' ? 'every' : 'specific',
          value: parts[0],
        });
        setHour({
          type: parts[1] === '*' ? 'every' : 'specific',
          value: parts[1],
        });
        setDayOfMonth({
          type: parts[2] === '*' ? 'every' : 'specific',
          value: parts[2],
        });
        setMonth({
          type: parts[3] === '*' ? 'every' : 'specific',
          value: parts[3],
        });
        setDayOfWeek({
          type: parts[4] === '*' ? 'every' : 'specific',
          value: parts[4],
        });
      }
    }

    // Reset flag after state updates
    setTimeout(() => {
      prevCronAndTab.current.isInitializing = false;
    }, 0);
  }, [activeTab, cronExpression]);

  // Update cron expression when custom fields change
  useEffect(() => {
    // Skip if we're initializing from tab change
    if (prevCronAndTab.current.isInitializing) return;

    if (activeTab === 'custom') {
      const newExpression = `${minute.value} ${hour.value} ${dayOfMonth.value} ${month.value} ${dayOfWeek.value}`;
      setCronExpression(newExpression);
      onSave(newExpression);
    }
  }, [minute, hour, dayOfMonth, month, dayOfWeek, activeTab, onSave]);

  // Calculate next execution dates when cron expression changes
  useEffect(() => {
    const valid = isValidCron(cronExpression);
    setIsValid(valid);

    if (valid) {
      const dates = getNextExecutionDates(cronExpression);
      setNextDates(dates);
    } else {
      setNextDates([]);
    }
  }, [cronExpression]);

  // Handle preset selection
  const handlePresetChange = useCallback(
    (value: string) => {
      setCronExpression(value);
      onSave(value);
    },
    [onSave]
  );

  // Handle manual cron expression change
  const handleCronExpressionChange = useCallback(
    (newExpression: string) => {
      setCronExpression(newExpression);
      if (isValidCron(newExpression)) {
        onSave(newExpression);
      }
    },
    [onSave]
  );

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cronExpression);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cronExpression]);

  // Update field based on type and value
  const updateField = useCallback(
    (
      field: { type: string; value: string },
      setField: React.Dispatch<
        React.SetStateAction<{ type: string; value: string }>
      >,
      type: string,
      value?: string
    ) => {
      if (type === 'every') {
        setField({ type, value: '*' });
      } else if (type === 'specific' && value) {
        setField({ type, value });
      } else {
        setField({ ...field, type });
      }
    },
    []
  );

  return (
    <SafeComponent
      level='component'
      title='Cron Generator Error'
      description='Failed to load cron expression generator'
    >
      <div className='flex flex-col space-y-4'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='presets' disabled={isDisabled}>
              {dict.workflow.schedule.presets}
            </TabsTrigger>
            <TabsTrigger value='custom' disabled={isDisabled}>
              {dict.workflow.schedule.custom}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='presets' className='mt-4'>
            <div
              className={cn(
                'flex flex-col space-y-2',
                isDisabled && 'pointer-events-none opacity-50'
              )}
            >
              <Label htmlFor='preset-select'>
                {dict.workflow.schedule.cron.selectPreset}
              </Label>
              <Select
                onValueChange={handlePresetChange}
                defaultValue={expression}
                disabled={isDisabled}
              >
                <SelectTrigger id='preset-select' className='w-full'>
                  <SelectValue
                    placeholder={dict.workflow.schedule.cron.selectPreset}
                  />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent
            value='custom'
            className='mt-4 flex flex-wrap justify-between space-y-4 space-x-4'
          >
            {/* Minutes */}
            <div
              className={`
                flex max-w-80 flex-col space-y-3 rounded-md border
                border-border/20 p-2
              `}
            >
              <div className='flex items-center justify-between'>
                <Label>{dict.workflow.schedule.cron.minutes}</Label>
                <Badge variant='secondary'>{minute.value}</Badge>
              </div>
              <RadioGroup
                value={minute.type}
                onValueChange={(value) => updateField(minute, setMinute, value)}
                className='flex flex-col space-y-1'
                disabled={isDisabled}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='every' id='minute-every' />
                  <Label htmlFor='minute-every'>
                    {dict.workflow.schedule.cron.everyMinute}
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='specific' id='minute-specific' />
                  <Label htmlFor='minute-specific'>
                    {dict.workflow.schedule.cron.specificMinute}
                  </Label>
                  <Select
                    disabled={minute.type !== 'specific'}
                    value={minute.type === 'specific' ? minute.value : '0'}
                    onValueChange={(value) =>
                      updateField(minute, setMinute, 'specific', value)
                    }
                  >
                    <SelectTrigger className='w-20'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map((m) => (
                        <SelectItem key={`minute-${m}`} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </RadioGroup>
            </div>

            {/* Hours */}
            <div
              className={`
                flex max-w-80 flex-col space-y-3 rounded-md border
                border-border/20 p-2
              `}
            >
              <div className='flex items-center justify-between'>
                <Label>{dict.workflow.schedule.cron.hours}</Label>
                <Badge variant='secondary'>{hour.value}</Badge>
              </div>
              <RadioGroup
                value={hour.type}
                onValueChange={(value) => updateField(hour, setHour, value)}
                className='flex flex-col space-y-1'
                disabled={isDisabled}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='every' id='hour-every' />
                  <Label htmlFor='hour-every'>
                    {dict.workflow.schedule.cron.everyHour}
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='specific' id='hour-specific' />
                  <Label htmlFor='hour-specific'>
                    {dict.workflow.schedule.cron.specificHour}
                  </Label>
                  <Select
                    disabled={hour.type !== 'specific'}
                    value={hour.type === 'specific' ? hour.value : '0'}
                    onValueChange={(value) =>
                      updateField(hour, setHour, 'specific', value)
                    }
                  >
                    <SelectTrigger className='w-20'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={`hour-${h}`} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </RadioGroup>
            </div>

            {/* Days of Month */}
            <div
              className={`
                flex max-w-80 flex-col space-y-3 rounded-md border
                border-border/20 p-2
              `}
            >
              <div className='flex items-center justify-between'>
                <Label>{dict.workflow.schedule.cron.dayOfMonth}</Label>
                <Badge variant='secondary'>{dayOfMonth.value}</Badge>
              </div>
              <RadioGroup
                value={dayOfMonth.type}
                onValueChange={(value) =>
                  updateField(dayOfMonth, setDayOfMonth, value)
                }
                className='flex flex-col space-y-1'
                disabled={isDisabled}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='every' id='dom-every' />
                  <Label htmlFor='dom-every'>
                    {dict.workflow.schedule.cron.everyDay}
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='specific' id='dom-specific' />
                  <Label htmlFor='dom-specific'>
                    {dict.workflow.schedule.cron.specificDay}
                  </Label>
                  <Select
                    disabled={dayOfMonth.type !== 'specific'}
                    value={
                      dayOfMonth.type === 'specific' ? dayOfMonth.value : '1'
                    }
                    onValueChange={(value) =>
                      updateField(dayOfMonth, setDayOfMonth, 'specific', value)
                    }
                  >
                    <SelectTrigger className='w-20'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_MONTH.map((d) => (
                        <SelectItem key={`dom-${d}`} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </RadioGroup>
            </div>

            {/* Months */}
            <div
              className={`
                flex max-w-80 flex-col space-y-3 rounded-md border
                border-border/20 p-2
              `}
            >
              <div className='flex items-center justify-between'>
                <Label>{dict.workflow.schedule.cron.month}</Label>
                <Badge variant='secondary'>{month.value}</Badge>
              </div>
              <RadioGroup
                value={month.type}
                onValueChange={(value) => updateField(month, setMonth, value)}
                className='flex flex-col space-y-1'
                disabled={isDisabled}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='every' id='month-every' />
                  <Label htmlFor='month-every'>
                    {dict.workflow.schedule.cron.everyMonth}
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='specific' id='month-specific' />
                  <Label htmlFor='month-specific'>
                    {dict.workflow.schedule.cron.specificMonth}
                  </Label>
                  <Select
                    disabled={month.type !== 'specific'}
                    value={month.type === 'specific' ? month.value : '1'}
                    onValueChange={(value) =>
                      updateField(month, setMonth, 'specific', value)
                    }
                  >
                    <SelectTrigger className='w-28'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={`month-${m.value}`} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </RadioGroup>
            </div>

            {/* Days of Week */}
            <div
              className={`
                flex max-w-80 flex-col space-y-3 rounded-md border
                border-border/20 p-2
              `}
            >
              <div className='flex items-center justify-between'>
                <Label>{dict.workflow.schedule.cron.dayOfWeek}</Label>
                <Badge variant='secondary'>{dayOfWeek.value}</Badge>
              </div>
              <RadioGroup
                value={dayOfWeek.type}
                onValueChange={(value) =>
                  updateField(dayOfWeek, setDayOfWeek, value)
                }
                className='flex flex-col space-y-1'
                disabled={isDisabled}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='every' id='dow-every' />
                  <Label htmlFor='dow-every'>
                    {dict.workflow.schedule.cron.everyWeekday}
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='specific' id='dow-specific' />
                  <Label htmlFor='dow-specific'>
                    {dict.workflow.schedule.cron.specificWeekday}
                  </Label>
                  <Select
                    disabled={dayOfWeek.type !== 'specific'}
                    value={
                      dayOfWeek.type === 'specific' ? dayOfWeek.value : '1'
                    }
                    onValueChange={(value) =>
                      updateField(dayOfWeek, setDayOfWeek, 'specific', value)
                    }
                  >
                    <SelectTrigger className='w-28'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={`dow-${d.value}`} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
        </Tabs>

        <div className='flex flex-col space-y-2'>
          <div className='flex flex-row items-center justify-between'>
            <Label>{dict.workflow.schedule.cron.generatedCron}</Label>
            <div className='flex flex-row items-center gap-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={handleCopy}
                      disabled={isDisabled}
                    >
                      <TbCopy
                        className={cn('size-4', copied ? 'text-accent' : '')}
                      />
                      <span className='sr-only'>
                        {dict.workflow.schedule.cron.copyCron}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {copied
                        ? dict.workflow.schedule.cron.copied
                        : dict.workflow.schedule.cron.copyToClipboard}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant='ghost' size='icon' className='size-6'>
                    <TbInfoCircle className='size-4' />
                    <span className='sr-only'>
                      {dict.workflow.schedule.cron.cronSyntaxHelp}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-80'>
                  <div className='space-y-2'>
                    <h4 className='font-medium'>
                      {dict.workflow.schedule.cron.cronSyntax}
                    </h4>
                    <p className='text-sm text-muted-foreground'>
                      {dict.workflow.schedule.cron.cronSyntaxDescription}
                    </p>
                    <div className='grid grid-cols-5 gap-1 font-mono text-xs'>
                      <div className='text-center'>minute</div>
                      <div className='text-center'>hour</div>
                      <div className='text-center'>day</div>
                      <div className='text-center'>month</div>
                      <div className='text-center'>weekday</div>
                      <div className='text-center'>(0-59)</div>
                      <div className='text-center'>(0-23)</div>
                      <div className='text-center'>(1-31)</div>
                      <div className='text-center'>(1-12)</div>
                      <div className='text-center'>(0-6)</div>
                    </div>
                    <p className='mt-2 text-xs text-muted-foreground'>
                      {dict.workflow.schedule.cron.cronSyntaxNote}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className='relative flex-col items-center gap-2'>
            <Input
              value={cronExpression}
              onChange={(e) => handleCronExpressionChange(e.target.value)}
              className={cn(
                'pr-10 font-mono',
                !isValid
                  ? `
                    border-destructive
                    focus-visible:ring-destructive
                  `
                  : `
                    border-accent
                    focus-visible:ring-accent
                  `
              )}
              aria-invalid={!isValid}
              disabled={isDisabled}
            />
            {!isValid && (
              <p className='mt-1 text-sm text-destructive'>
                {dict.workflow.schedule.cron.invalidCron}
              </p>
            )}
          </div>
        </div>

        <div className='mt-6 flex flex-col space-y-2'>
          <Label>{dict.workflow.schedule.cron.nextExecutionTimes}</Label>
          {nextDates.length > 0 ? (
            <ul className='space-y-2'>
              {nextDates.map((date) => (
                <li
                  key={`next-execution-${date.getTime()}`}
                  className='rounded-md bg-muted p-2 text-sm'
                >
                  {format(date, 'PPpp')}
                </li>
              ))}
            </ul>
          ) : (
            <p className='pl-1 text-sm text-muted-foreground'>
              {dict.workflow.schedule.cron.invalidCron}
            </p>
          )}
        </div>
      </div>
    </SafeComponent>
  );
};

export default memo(CronGenerator);
