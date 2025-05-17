'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { format, parseISO } from 'date-fns';
import ReactSelect from 'react-select';
import { Frequency, RRule, rrulestr, Weekday } from 'rrule';

import { TbCopy, TbInfoCircle } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

// Common RRule presets
const PRESETS = [
  {
    label: 'Every minute',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\nFREQ=MINUTELY;INTERVAL=1`,
  },
  {
    label: 'Every hour',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\nFREQ=HOURLY;INTERVAL=1`,
  },
  {
    label: 'Every day at midnight',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'000000'Z'")}\nFREQ=DAILY;BYHOUR=0;BYMINUTE=0`,
  },
  {
    label: 'Every day at noon',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'120000'Z'")}\nFREQ=DAILY;BYHOUR=12;BYMINUTE=0`,
  },
  {
    label: 'Every Monday',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\nFREQ=WEEKLY;BYDAY=MO`,
  },
  {
    label: 'Every weekday',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\nFREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`,
  },
  {
    label: 'Every weekend',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\nFREQ=WEEKLY;BYDAY=SA,SU`,
  },
  {
    label: 'Every month on the 1st',
    value: (startDate: Date) =>
      `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\nFREQ=MONTHLY;BYMONTHDAY=1`,
  },
];

const frequencies = [
  { value: Frequency.SECONDLY, label: 'Secondly' },
  { value: Frequency.MINUTELY, label: 'Minutely' },
  { value: Frequency.HOURLY, label: 'Hourly' },
  { value: Frequency.DAILY, label: 'Daily' },
  { value: Frequency.WEEKLY, label: 'Weekly' },
  { value: Frequency.MONTHLY, label: 'Monthly' },
  { value: Frequency.YEARLY, label: 'Yearly' },
];

const weekdays = [
  { value: RRule.MO, label: 'Monday' },
  { value: RRule.TU, label: 'Tuesday' },
  { value: RRule.WE, label: 'Wednesday' },
  { value: RRule.TH, label: 'Thursday' },
  { value: RRule.FR, label: 'Friday' },
  { value: RRule.SA, label: 'Saturday' },
  { value: RRule.SU, label: 'Sunday' },
];

// Calculate next execution dates for an RRule string
const getNextExecutionDates = (rruleString: string, count = 5): Date[] => {
  try {
    const rrule = rrulestr(rruleString);
    return rrule.all((_, len) => len < count);
  } catch (error) {
    console.error(error);
    return [];
  }
};

/**
 * Component to generate RRule strings
 *
 * @param props - Component props
 * @param props.rule - Initial RRule string
 * @param props.onGenerate - Callback function to handle the generated RRule string
 * @param props.isDisabled - Whether the component is disabled
 */
export default function RRuleGenerator({
  rule,
  onGenerate,
  isDisabled = false,
}: {
  rule?: string;
  onGenerate: (rule: string) => void;
  isDisabled?: boolean;
}) {
  const { dict } = useLocale();

  const [activeTab, setActiveTab] = useState('presets');
  const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([]);
  const [interval, setInterval] = useState<number>(1);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [generatedRule, setGeneratedRule] = useState<string>(rule || '');
  const [nextDates, setNextDates] = useState<Date[]>([]);
  const [copied, setCopied] = useState(false);

  const initialised = useRef(false);
  const previousRule = useRef(rule);

  // Update the initial state if the rule changes
  useEffect(() => {
    if (initialised.current) return;
    try {
      if (!rule || rule.length === 0) return;

      const rrule = rrulestr(rule);
      setGeneratedRule(rule);
      setFrequency(rrule.options.freq);
      setInterval(rrule.options.interval || 1);
      setSelectedWeekdays(rrule.options.byweekday.map((d) => new Weekday(d)));

      // Extract DTSTART if present
      const dtstartMatch = rule.match(/DTSTART:(\d{8}T\d{6}Z)/);
      if (dtstartMatch) {
        const dtstart = parseISO(
          dtstartMatch[1].replace(
            /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
            '$1-$2-$3T$4:$5:$6Z'
          )
        );
        setStartDate(dtstart);
      }
    } catch (error) {
      console.error(error);
    } finally {
      initialised.current = true;
    }
  }, [rule]);

  // Generate the RRule string when the form changes
  useEffect(() => {
    if (!initialised.current) return;
    const rrule = new RRule({
      freq: frequency,
      interval: interval,
      byweekday: selectedWeekdays,
      dtstart: startDate,
    });
    const ruleStr = `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}\n${rrule.toString()}`;
    setGeneratedRule(ruleStr);

    if (ruleStr === previousRule.current) return;
    previousRule.current = ruleStr;
    onGenerate(ruleStr);
  }, [frequency, interval, selectedWeekdays, startDate, onGenerate]);

  // Calculate next execution dates when rule changes
  useEffect(() => {
    const dates = getNextExecutionDates(generatedRule);
    setNextDates(dates);
  }, [generatedRule]);

  // Handle preset selection
  const handlePresetChange = useCallback(
    (preset: (typeof PRESETS)[0]) => {
      const ruleStr = preset.value(startDate);
      setGeneratedRule(ruleStr);
      onGenerate(ruleStr);
      try {
        const rrule = rrulestr(ruleStr);
        setFrequency(rrule.options.freq);
        setInterval(rrule.options.interval || 1);
        setStartDate(rrule.options.dtstart || new Date());
        if (rrule.options.byweekday) {
          setSelectedWeekdays(
            rrule.options.byweekday.map((d) => new Weekday(d))
          );
        }
      } catch (error) {
        console.error(error);
      }
    },
    [onGenerate, startDate]
  );

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedRule);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedRule]);

  // Handle weekday selection
  const handleWeekdayChange = useCallback((weekday: Weekday) => {
    setSelectedWeekdays((prev) =>
      prev.includes(weekday)
        ? prev.filter((day) => day !== weekday)
        : [...prev, weekday]
    );
  }, []);

  return (
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
              {dict.workflow.schedule.rrule.selectPreset}
            </Label>
            <Select
              onValueChange={(value) => {
                const preset = PRESETS.find((p) => p.label === value);
                if (preset) handlePresetChange(preset);
              }}
              defaultValue={rule}
              disabled={isDisabled}
            >
              <SelectTrigger id='preset-select' className='w-full'>
                <SelectValue
                  placeholder={dict.workflow.schedule.rrule.selectPreset}
                />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent
          value='custom'
          className='mt-4 flex flex-wrap space-y-4 space-x-4'
        >
          <div className='border-border/20 flex w-full max-w-80 flex-col space-y-3 rounded-md border p-2'>
            <div className='flex items-center justify-between'>
              <Label>{dict.workflow.schedule.rrule.startDate}</Label>
            </div>
            <Input
              type='datetime-local'
              value={format(startDate, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              disabled={isDisabled}
            />
          </div>

          <div className='border-border/20 flex w-full max-w-80 flex-col space-y-3 rounded-md border p-2'>
            <div className='flex items-center justify-between'>
              <Label>{dict.workflow.schedule.rrule.frequency}</Label>
              <Badge variant='secondary'>
                {frequencies.find((f) => f.value === frequency)?.label}
              </Badge>
            </div>
            <ReactSelect
              options={frequencies}
              value={frequencies.find((f) => f.value === frequency)}
              onChange={(option) =>
                setFrequency(option?.value || Frequency.DAILY)
              }
              className='react-select-container'
              classNamePrefix='react-select'
              isDisabled={isDisabled}
            />
          </div>

          <div className='border-border/20 flex w-full max-w-80 flex-col space-y-3 rounded-md border p-2'>
            <div className='flex items-center justify-between'>
              <Label>{dict.workflow.schedule.rrule.interval}</Label>
              <Badge variant='secondary'>{interval}</Badge>
            </div>
            <Input
              type='number'
              min='1'
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              disabled={isDisabled}
            />
          </div>

          <div className='border-border/20 flex w-full max-w-80 flex-col space-y-3 rounded-md border p-2'>
            <div className='flex items-center justify-between'>
              <Label>{dict.workflow.schedule.rrule.weekdays}</Label>
              <Badge variant='secondary'>
                {selectedWeekdays.length === 0
                  ? dict.workflow.schedule.rrule.none
                  : selectedWeekdays.length === 7
                    ? dict.workflow.schedule.rrule.everyDay
                    : `${selectedWeekdays.length} ${dict.workflow.schedule.rrule.selected}`}
              </Badge>
            </div>
            <div className='flex flex-wrap gap-3 pl-2'>
              {weekdays.map((day) => (
                <div key={day.label} className='flex items-center space-x-1'>
                  <Checkbox
                    id={day.label}
                    checked={selectedWeekdays.includes(day.value)}
                    onCheckedChange={() => handleWeekdayChange(day.value)}
                    disabled={isDisabled}
                  />
                  <Label htmlFor={day.label}>{day.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className='flex flex-col space-y-2'>
        <div className='flex flex-row items-center justify-between'>
          <Label>{dict.workflow.schedule.rrule.generatedRRule}</Label>
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
                      className={cn('h-4 w-4', copied ? 'text-accent' : '')}
                    />
                    <span className='sr-only'>
                      {dict.workflow.schedule.rrule.copyRRule}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {copied
                      ? dict.workflow.schedule.rrule.copied
                      : dict.workflow.schedule.rrule.copyToClipboard}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='ghost' size='icon' className='h-6 w-6'>
                  <TbInfoCircle className='h-4 w-4' />
                  <span className='sr-only'>
                    {dict.workflow.schedule.rrule.rruleSyntaxHelp}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-80'>
                <div className='space-y-2'>
                  <h4 className='font-medium'>
                    {dict.workflow.schedule.rrule.rruleSyntax}
                  </h4>
                  <p className='text-muted-foreground text-sm'>
                    {dict.workflow.schedule.rrule.rruleSyntaxDescription}
                  </p>
                  <ul className='text-muted-foreground list-disc pl-4 text-sm'>
                    <li>
                      {dict.workflow.schedule.rrule.rruleSyntaxOptions.freq}
                    </li>
                    <li>
                      {dict.workflow.schedule.rrule.rruleSyntaxOptions.interval}
                    </li>
                    <li>
                      {dict.workflow.schedule.rrule.rruleSyntaxOptions.byday}
                    </li>
                    <li>
                      {dict.workflow.schedule.rrule.rruleSyntaxOptions.byhour}
                    </li>
                    <li>
                      {dict.workflow.schedule.rrule.rruleSyntaxOptions.byminute}
                    </li>
                  </ul>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className='relative flex-col items-center gap-2'>
          <Input
            value={generatedRule}
            readOnly
            className='border-accent focus-visible:ring-accent pr-10 font-mono'
            disabled={isDisabled}
          />
        </div>
      </div>

      <div className='mt-6 flex flex-col space-y-2'>
        <Label>{dict.workflow.schedule.rrule.nextExecutionTimes}</Label>
        {nextDates.length > 0 ? (
          <ul className='space-y-2'>
            {nextDates.map((date, index) => (
              <li key={index} className='bg-muted rounded-md p-2 text-sm'>
                {format(date, 'PPpp')}
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-muted-foreground pl-1 text-sm'>
            {dict.workflow.schedule.rrule.invalidRRule}
          </p>
        )}
      </div>
    </div>
  );
}
