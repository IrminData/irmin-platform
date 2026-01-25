'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { useLocale } from '@/context/LocaleContext';

import type { AIApplicationWriteConfig as WriteConfigType } from '@/types/core/AIApplication';

/** Debounce delay for text input in milliseconds */
const DEBOUNCE_DELAY_MS = 500;

interface AIApplicationWriteConfigProps {
  /** Current write configuration */
  writeConfig: WriteConfigType | undefined;
  /** Callback when a config option is toggled */
  onToggle: (key: keyof WriteConfigType, value: boolean | string) => void;
  /** Whether the controls are disabled */
  disabled: boolean;
}

interface DebouncedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  className?: string;
}

/**
 * Debounced text input for commit message prefix.
 * Uses local state for immediate feedback while debouncing the API call.
 */
const DebouncedInput = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: DebouncedInputProps) => {
  // Use local state initialized from prop, with key-based reset
  const [localValue, setLocalValue] = useState(value);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Keep refs up to date via effect (not during render)
  useEffect(() => {
    localValueRef.current = localValue;
  }, [localValue]);

  // Update onChangeRef every render to ensure it's current when other effects use it
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // When disabled with a pending debounce, flush immediately to preserve user's
  // uncommitted value. The ref is updated by the effect above (which runs first).
  useEffect(() => {
    if (disabled && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      // Flush the uncommitted value immediately
      onChangeRef.current(localValueRef.current);
      setIsTyping(false);
    }
  }, [disabled]);

  // When prop value changes and user isn't typing, sync local state
  // Using a pattern that avoids setState in effect by tracking previous value
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value && !isTyping) {
    setPrevValue(value);
    setLocalValue(value);
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      setIsTyping(true);

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new debounced call — use onChangeRef to avoid stale closure when
      // parent state (e.g. other toggles) changes during the debounce delay
      timeoutRef.current = setTimeout(() => {
        onChangeRef.current(newValue);
        setIsTyping(false);
        timeoutRef.current = null;
      }, DEBOUNCE_DELAY_MS);
    },
    []
  );

  // Cleanup timeout on unmount - don't flush because onChangeRef may be stale
  // (the effect that updates it doesn't run on unmount) and could cause
  // mutations with outdated state, potentially re-enabling settings the user disabled
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
};

/**
 * AI Application write configuration options
 * Controls file upload, update, patch, commit settings, and approval requirements
 */
const AIApplicationWriteConfig = ({
  writeConfig,
  onToggle,
  disabled,
}: AIApplicationWriteConfigProps) => {
  const { dict } = useLocale();

  const handlePrefixChange = useCallback(
    (value: string) => {
      onToggle('commit_message_prefix', value);
    },
    [onToggle]
  );

  return (
    <>
      {/* File Upload */}
      <div className='flex items-center justify-between'>
        <span className='text-sm'>{dict.aiApplication.writeFileUpload}</span>
        <Switch
          checked={writeConfig?.file_upload_enabled ?? false}
          onCheckedChange={(checked) =>
            onToggle('file_upload_enabled', checked)
          }
          disabled={disabled}
        />
      </div>

      {/* File Update */}
      <div className='flex items-center justify-between'>
        <span className='text-sm'>{dict.aiApplication.writeFileUpdate}</span>
        <Switch
          checked={writeConfig?.file_update_enabled ?? false}
          onCheckedChange={(checked) =>
            onToggle('file_update_enabled', checked)
          }
          disabled={disabled}
        />
      </div>

      {/* JSON Patch */}
      <div className='flex items-center justify-between'>
        <span className='text-sm'>{dict.aiApplication.writePatch}</span>
        <Switch
          checked={writeConfig?.patch_enabled ?? false}
          onCheckedChange={(checked) => onToggle('patch_enabled', checked)}
          disabled={disabled}
        />
      </div>

      {/* Auto Commit */}
      <div className='flex items-center justify-between'>
        <span className='text-sm'>{dict.aiApplication.writeAutoCommit}</span>
        <Switch
          checked={writeConfig?.auto_commit ?? true}
          onCheckedChange={(checked) => onToggle('auto_commit', checked)}
          disabled={disabled}
        />
      </div>

      {/* Require Commit Message */}
      <div className='flex items-center justify-between'>
        <span className='text-sm'>
          {dict.aiApplication.writeRequireCommitMessage}
        </span>
        <Switch
          checked={writeConfig?.require_commit_message ?? false}
          onCheckedChange={(checked) =>
            onToggle('require_commit_message', checked)
          }
          disabled={disabled}
        />
      </div>

      {/* Require Approval */}
      <div className='flex items-center justify-between'>
        <span className='text-sm'>
          {dict.aiApplication.writeRequireApproval}
        </span>
        <Switch
          checked={writeConfig?.require_approval ?? false}
          onCheckedChange={(checked) => onToggle('require_approval', checked)}
          disabled={disabled}
        />
      </div>

      {/* Commit Message Prefix */}
      <div className='space-y-1'>
        <span className='text-sm'>
          {dict.aiApplication.writeCommitMessagePrefix}
        </span>
        <DebouncedInput
          value={writeConfig?.commit_message_prefix ?? ''}
          onChange={handlePrefixChange}
          placeholder='[AI Agent] '
          className='text-sm'
          disabled={disabled}
        />
      </div>
    </>
  );
};

export default AIApplicationWriteConfig;
