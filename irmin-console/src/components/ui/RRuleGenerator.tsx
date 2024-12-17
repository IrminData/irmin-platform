'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import ReactSelect from 'react-select';
import { Frequency, RRule, rrulestr, Weekday } from 'rrule';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

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

/**
 * Component to generate RRule strings
 *
 * @param props - Component props
 * @param props.rule - Initial RRule string
 * @param props.onGenerate - Callback function to handle the generated RRule string
 */
export default function RRuleGenerator({
  rule,
  onGenerate,
}: {
  rule?: string;
  onGenerate: (rule: string) => void;
}) {
  const { dict } = useLocale();

  const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([]);
  const [interval, setInterval] = useState<number>(1);
  const [generatedRuleForHumans, setGeneratedRuleForHumans] =
    useState<string>('');

  const initialised = useRef(false);
  const previousRule = useRef(rule);

  // Update the initial state if the rule changes
  useEffect(() => {
    if (initialised.current) return;
    try {
      if (!rule || rule.length === 0) return;

      const rrule = rrulestr(rule);

      setFrequency(rrule.options.freq);
      setInterval(rrule.options.interval || 1);
      setSelectedWeekdays(rrule.options.byweekday.map((d) => new Weekday(d)));
      setGeneratedRuleForHumans(rrule.toText());
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
    });
    const ruleStr = rrule.toString();
    const humanText = rrule.toText();
    setGeneratedRuleForHumans(humanText);

    if (ruleStr === previousRule.current) return;
    previousRule.current = ruleStr;
    onGenerate(ruleStr);
  }, [frequency, interval, selectedWeekdays, onGenerate]);

  // Handle weekday selection
  const handleWeekdayChange = useCallback((weekday: Weekday) => {
    setSelectedWeekdays((prev) =>
      prev.includes(weekday)
        ? prev.filter((day) => day !== weekday)
        : [...prev, weekday]
    );
  }, []);

  return (
    <div className='space-y-6'>
      <p className='pl-1 text-sm font-semibold'>{generatedRuleForHumans}</p>

      <div className='space-y-2'>
        <Label htmlFor='frequency'>{dict.workflow.schedule.frequency}</Label>
        <ReactSelect
          id='frequency'
          options={frequencies}
          value={frequencies.find((f) => f.value === frequency)}
          onChange={(option) => setFrequency(option?.value || Frequency.DAILY)}
          className='react-select-container'
          classNamePrefix='react-select'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='interval'>{dict.workflow.schedule.interval}</Label>
        <Input
          id='interval'
          type='number'
          min='1'
          value={interval}
          onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
        />
      </div>

      <div className='max-w-sm space-y-2'>
        <Label>{dict.workflow.schedule.weekdays}</Label>
        <div className='flex flex-wrap gap-3 pl-2'>
          {weekdays.map((day) => (
            <div key={day.label} className='flex items-center space-x-1'>
              <Checkbox
                id={day.label}
                checked={selectedWeekdays.includes(day.value)}
                onCheckedChange={() => handleWeekdayChange(day.value)}
              />
              <Label htmlFor={day.label}>{day.label}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
